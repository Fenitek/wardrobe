package expo.modules.backgroundremover

import android.graphics.Bitmap
import android.graphics.Color
import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.segmentation.subject.SubjectSegmentation
import com.google.mlkit.vision.segmentation.subject.SubjectSegmenterOptions
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.util.UUID

class NoSubjectException : CodedException("Nessun soggetto trovato nella foto")

class ImageLoadException(uri: String, cause: Throwable?) :
  CodedException("Impossibile leggere l'immagine '$uri'", cause)

/** Rimuove lo sfondo da una foto usando la segmentazione del soggetto di ML Kit. */
class BackgroundRemoverModule : Module() {
  private val context
    get() = requireNotNull(appContext.reactContext)

  override fun definition() = ModuleDefinition {
    Name("BackgroundRemover")

    Function("isSupported") { true }

    AsyncFunction("removeBackgroundAsync") Coroutine { uri: String ->
      val image = try {
        InputImage.fromFilePath(context, Uri.parse(uri))
      } catch (e: Exception) {
        throw ImageLoadException(uri, e)
      }

      val options = SubjectSegmenterOptions.Builder()
        .enableForegroundBitmap()
        .build()
      val segmenter = SubjectSegmentation.getClient(options)
      val result = try {
        segmenter.process(image).await()
      } finally {
        segmenter.close()
      }

      val foreground = result.foregroundBitmap ?: throw NoSubjectException()

      withContext(Dispatchers.IO) {
        val cropped = cropToContent(foreground) ?: throw NoSubjectException()
        val file = File(context.cacheDir, "cutout-${UUID.randomUUID()}.png")
        FileOutputStream(file).use { cropped.compress(Bitmap.CompressFormat.PNG, 100, it) }
        mapOf(
          "uri" to Uri.fromFile(file).toString(),
          "width" to cropped.width,
          "height" to cropped.height
        )
      }
    }
  }

  /** Ritaglia il bitmap all'area con pixel non trasparenti. */
  private fun cropToContent(bitmap: Bitmap): Bitmap? {
    val width = bitmap.width
    val height = bitmap.height
    val pixels = IntArray(width * height)
    bitmap.getPixels(pixels, 0, width, 0, 0, width, height)

    var minX = width
    var minY = height
    var maxX = -1
    var maxY = -1
    for (y in 0 until height) {
      val row = y * width
      for (x in 0 until width) {
        if (Color.alpha(pixels[row + x]) > 16) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }
    if (maxX < minX || maxY < minY) return null
    return Bitmap.createBitmap(bitmap, minX, minY, maxX - minX + 1, maxY - minY + 1)
  }
}
