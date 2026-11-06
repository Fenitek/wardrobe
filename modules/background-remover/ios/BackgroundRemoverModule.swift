import CoreImage
import ExpoModulesCore
import UIKit
import Vision

/// Rimuove lo sfondo da una foto usando l'isolamento del soggetto di Vision (iOS 17+).
public final class BackgroundRemoverModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BackgroundRemover")

    Function("isSupported") { () -> Bool in
      if #available(iOS 17.0, *) {
        return true
      }
      return false
    }

    AsyncFunction("removeBackgroundAsync") { (uri: String) -> [String: Any] in
      guard #available(iOS 17.0, *) else {
        throw UnsupportedVersionException()
      }
      guard let url = URL(string: uri),
            let data = try? Data(contentsOf: url),
            let image = UIImage(data: data),
            let cgImage = Self.upright(image).cgImage else {
        throw ImageLoadException(uri)
      }

      let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
      let request = VNGenerateForegroundInstanceMaskRequest()
      try handler.perform([request])

      guard let observation = request.results?.first, !observation.allInstances.isEmpty else {
        throw NoSubjectException()
      }

      let buffer = try observation.generateMaskedImage(
        ofInstances: observation.allInstances,
        from: handler,
        croppedToInstancesExtent: true
      )
      let ciImage = CIImage(cvPixelBuffer: buffer)
      let context = CIContext()
      guard let output = context.createCGImage(ciImage, from: ciImage.extent),
            let png = UIImage(cgImage: output).pngData() else {
        throw ImageSaveException()
      }

      let fileURL = FileManager.default.temporaryDirectory
        .appendingPathComponent("cutout-\(UUID().uuidString).png")
      try png.write(to: fileURL)

      return [
        "uri": fileURL.absoluteString,
        "width": output.width,
        "height": output.height
      ]
    }
  }

  /// Applica l'orientamento EXIF, così la maschera corrisponde a ciò che vede l'utente.
  private static func upright(_ image: UIImage) -> UIImage {
    if image.imageOrientation == .up {
      return image
    }
    let format = UIGraphicsImageRendererFormat.default()
    format.scale = image.scale
    return UIGraphicsImageRenderer(size: image.size, format: format).image { _ in
      image.draw(in: CGRect(origin: .zero, size: image.size))
    }
  }
}

internal final class UnsupportedVersionException: Exception {
  override var reason: String {
    "La rimozione dello sfondo richiede iOS 17 o successivo"
  }
}

internal final class ImageLoadException: GenericException<String> {
  override var reason: String {
    "Impossibile leggere l'immagine '\(param)'"
  }
}

internal final class NoSubjectException: Exception {
  override var reason: String {
    "Nessun soggetto trovato nella foto"
  }
}

internal final class ImageSaveException: Exception {
  override var reason: String {
    "Impossibile salvare l'immagine scontornata"
  }
}
