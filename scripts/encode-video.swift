// =========================================================================
// WISY SAFETY — Encodeur vidéo web (macOS, AVFoundation — aucun outil à installer)
//
//   swiftc -O scripts/encode-video.swift -o /tmp/encode-video
//   /tmp/encode-video <source.mp4> <sortie.mp4> <hauteur> <kbit/s vidéo> <kbit/s audio> [gain dB]
//
// Exemple (versions de la vidéo « VCA Entreprise », voir docs/README-VCA-ENTREPRISE.md) :
//   /tmp/encode-video assets/originaux/vca-entreprise/vca-entreprise-source.mp4 \
//                     assets/videos/vca-entreprise/vca-entreprise-720.mp4 720 2200 128 -1
//
// Ce que fait l'outil :
//   • H.264 profil High, 24 i/s conservées, image-clé toutes les 2 s (déplacement fluide dans la vidéo) ;
//   • AAC stéréo 48 kHz — LE SON EST CONSERVÉ ; un gain négatif (défaut -1 dB) laisse de la marge avant
//     l'encodage AAC : la source touche 0 dBFS et un codec avec perte peut sinon écrêter les pics ;
//   • « faststart » : l'index (moov) est placé EN TÊTE du fichier → la lecture démarre sans attendre la fin
//     du téléchargement, et la recherche par octets (Range) fonctionne.
//
// Aucune dépendance : le code du système suffit (l'équivalent ffmpeg est donné dans la doc).
// =========================================================================
import AVFoundation
import CoreMedia
import Foundation

func fail(_ msg: String) -> Never { FileHandle.standardError.write(Data((msg + "\n").utf8)); exit(1) }

let args = CommandLine.arguments
if args.count < 6 { fail("usage: encode-video <source> <sortie.mp4> <hauteur> <kbit/s vidéo> <kbit/s audio> [gain dB]") }
let inURL = URL(fileURLWithPath: args[1]), outURL = URL(fileURLWithPath: args[2])
guard let outH = Int(args[3]), let vKbps = Int(args[4]), let aKbps = Int(args[5]) else { fail("hauteur / débits invalides") }
let gainDb = args.count > 6 ? (Double(args[6]) ?? -1.0) : -1.0
let gain = Float(pow(10.0, gainDb / 20.0))

let asset = AVURLAsset(url: inURL)
guard let vTrack = asset.tracks(withMediaType: .video).first else { fail("pas de piste vidéo") }
let aTrack = asset.tracks(withMediaType: .audio).first
let srcSize = vTrack.naturalSize
let outW = Int((Double(outH) * Double(srcSize.width) / Double(srcSize.height) / 2.0).rounded()) * 2   // largeur paire
let fps = max(1, Int(vTrack.nominalFrameRate.rounded()))

try? FileManager.default.removeItem(at: outURL)
guard let reader = try? AVAssetReader(asset: asset), let writer = try? AVAssetWriter(outputURL: outURL, fileType: .mp4) else { fail("lecteur/écrivain impossible") }
writer.shouldOptimizeForNetworkUse = true

/* ---- vidéo : décodage 4:2:0 → encodage H.264 (le décodeur ramène l'image à la taille de sortie) ---- */
let vRead = AVAssetReaderTrackOutput(track: vTrack, outputSettings: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange,
    kCVPixelBufferWidthKey as String: outW, kCVPixelBufferHeightKey as String: outH
])
vRead.alwaysCopiesSampleData = false
reader.add(vRead)
let vWrite = AVAssetWriterInput(mediaType: .video, outputSettings: [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: outW, AVVideoHeightKey: outH,
    AVVideoScalingModeKey: AVVideoScalingModeResizeAspectFill,
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: vKbps * 1000,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
        AVVideoMaxKeyFrameIntervalKey: fps * 2,
        AVVideoExpectedSourceFrameRateKey: fps,
        AVVideoAllowFrameReorderingKey: true,
        AVVideoH264EntropyModeKey: AVVideoH264EntropyModeCABAC
    ] as [String: Any]
])
vWrite.expectsMediaDataInRealTime = false
writer.add(vWrite)

/* ---- audio : PCM 16 bits 48 kHz stéréo (+ gain) → AAC ---- */
var aRead: AVAssetReaderTrackOutput? = nil, aWrite: AVAssetWriterInput? = nil
if let aTrack = aTrack {
    let r = AVAssetReaderTrackOutput(track: aTrack, outputSettings: [
        AVFormatIDKey: kAudioFormatLinearPCM, AVLinearPCMBitDepthKey: 16, AVLinearPCMIsFloatKey: false,
        AVLinearPCMIsBigEndianKey: false, AVLinearPCMIsNonInterleaved: false, AVSampleRateKey: 48000, AVNumberOfChannelsKey: 2
    ])
    reader.add(r); aRead = r
    let w = AVAssetWriterInput(mediaType: .audio, outputSettings: [
        AVFormatIDKey: kAudioFormatMPEG4AAC, AVNumberOfChannelsKey: 2, AVSampleRateKey: 48000, AVEncoderBitRateKey: aKbps * 1000
    ])
    w.expectsMediaDataInRealTime = false
    writer.add(w); aWrite = w
}

guard reader.startReading() else { fail("lecture impossible : \(String(describing: reader.error))") }
guard writer.startWriting() else { fail("écriture impossible : \(String(describing: writer.error))") }
writer.startSession(atSourceTime: .zero)

let group = DispatchGroup()
var peakIn: Int16 = 0, peakOut: Int16 = 0

func pump(_ input: AVAssetWriterInput, _ output: AVAssetReaderOutput, queue: String, isAudio: Bool) {
    group.enter()
    input.requestMediaDataWhenReady(on: DispatchQueue(label: queue)) {
        while input.isReadyForMoreMediaData {
            guard let sb = output.copyNextSampleBuffer() else { input.markAsFinished(); group.leave(); return }
            if isAudio, let bb = CMSampleBufferGetDataBuffer(sb) {
                var len = 0; var ptr: UnsafeMutablePointer<Int8>? = nil
                if CMBlockBufferGetDataPointer(bb, atOffset: 0, lengthAtOffsetOut: nil, totalLengthOut: &len, dataPointerOut: &ptr) == kCMBlockBufferNoErr, let p = ptr {
                    p.withMemoryRebound(to: Int16.self, capacity: len / 2) { s in
                        for i in 0..<(len / 2) {
                            peakIn = max(peakIn, s[i] == Int16.min ? Int16.max : abs(s[i]))
                            let v = Float(s[i]) * gain
                            s[i] = Int16(max(-32768, min(32767, v.rounded())))
                            peakOut = max(peakOut, s[i] == Int16.min ? Int16.max : abs(s[i]))
                        }
                    }
                }
            }
            if !input.append(sb) { input.markAsFinished(); group.leave(); return }
        }
    }
}
pump(vWrite, vRead, queue: "wisy.video", isAudio: false)
if let aw = aWrite, let ar = aRead { pump(aw, ar, queue: "wisy.audio", isAudio: true) }

group.notify(queue: .main) {
    writer.finishWriting {
        if writer.status != .completed { fail("échec : \(String(describing: writer.error))") }
        let size = (try? FileManager.default.attributesOfItem(atPath: outURL.path)[.size] as? Int) ?? 0
        print(String(format: "ok %@ · %dx%d · %d i/s · %.2f Mo · crête audio %.1f → %.1f dBFS (gain %.1f dB)",
                     outURL.lastPathComponent, outW, outH, fps, Double(size) / 1_048_576.0,
                     peakIn > 0 ? 20 * log10(Double(peakIn) / 32767.0) : -99, peakOut > 0 ? 20 * log10(Double(peakOut) / 32767.0) : -99, gainDb))
        exit(0)
    }
}
dispatchMain()
