package com.jjplatform.api.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Iterator;

/**
 * Validates uploaded images against a per-purpose profile:
 *  - real format (magic bytes), not just the client-provided Content-Type
 *  - size in bytes
 *  - pixel dimensions (when decodable; WebP may be skipped if ImageIO lacks a plugin)
 */
@Service
@Slf4j
public class ImageValidator {

    public enum Profile {
        /** Academy logo: small, square-ish. */
        LOGO(1L * 1024 * 1024, 100, 1024, 100, 1024, "logo"),
        /** Student / professor profile photo. Min 500px so it stays sharp in avatars on hi-DPI screens. */
        PROFILE(2L * 1024 * 1024, 500, 3000, 500, 3000, "foto de perfil"),
        /** Public gallery photo. */
        GALLERY(5L * 1024 * 1024, 600, 4000, 400, 4000, "foto de galería");

        public final long maxBytes;
        public final int minWidth;
        public final int maxWidth;
        public final int minHeight;
        public final int maxHeight;
        public final String spanishLabel;

        Profile(long maxBytes, int minWidth, int maxWidth, int minHeight, int maxHeight, String spanishLabel) {
            this.maxBytes = maxBytes;
            this.minWidth = minWidth;
            this.maxWidth = maxWidth;
            this.minHeight = minHeight;
            this.maxHeight = maxHeight;
            this.spanishLabel = spanishLabel;
        }
    }

    public enum DetectedFormat {
        JPEG("image/jpeg", ".jpg"),
        PNG("image/png", ".png"),
        GIF("image/gif", ".gif"),
        WEBP("image/webp", ".webp");

        public final String mime;
        public final String extension;

        DetectedFormat(String mime, String extension) {
            this.mime = mime;
            this.extension = extension;
        }
    }

    public DetectedFormat validate(MultipartFile file, Profile profile) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("El archivo está vacío.");
        }

        if (file.getSize() > profile.maxBytes) {
            throw new IllegalArgumentException(
                    "La imagen supera el peso máximo permitido (" + (profile.maxBytes / (1024 * 1024)) + " MB para " + profile.spanishLabel + ").");
        }

        byte[] header = new byte[16];
        try (InputStream in = file.getInputStream()) {
            int read = in.readNBytes(header, 0, header.length);
            if (read < 12) {
                throw new IllegalArgumentException("El archivo no es una imagen válida.");
            }
        }

        DetectedFormat format = detectFormat(header);
        if (format == null) {
            throw new IllegalArgumentException("Formato de imagen no soportado. Se permiten JPEG, PNG, GIF y WebP.");
        }

        // Read the pixel dimensions from the image *header* only, without decoding the
        // full raster. Decoding first (ImageIO.read) would allocate width*height*4 bytes
        // BEFORE we get a chance to reject an oversized image — a small file can decode to
        // gigabytes (a "decompression bomb"). Validating dimensions up front closes that.
        //
        // ImageIO out of the box handles JPEG, PNG, GIF, BMP; WebP needs an external plugin.
        // If no reader is available (e.g. WebP without a plugin) we keep the upload but skip
        // dim checks, matching the previous behaviour.
        int w;
        int h;
        try (InputStream in = file.getInputStream();
             ImageInputStream iis = ImageIO.createImageInputStream(in)) {

            if (iis == null) {
                throw new IllegalArgumentException("No se pudo procesar la imagen. El archivo puede estar corrupto.");
            }

            Iterator<ImageReader> readers = ImageIO.getImageReaders(iis);
            if (!readers.hasNext()) {
                if (format == DetectedFormat.WEBP) {
                    log.debug("Skipping dimension check for WebP (ImageIO plugin not present)");
                    return format;
                }
                throw new IllegalArgumentException("El archivo no es una imagen válida.");
            }

            ImageReader reader = readers.next();
            try {
                // false = do not read pixel data, only what's needed to serve metadata.
                reader.setInput(iis, true, true);
                w = reader.getWidth(0);
                h = reader.getHeight(0);
            } finally {
                reader.dispose();
            }
        } catch (IOException e) {
            throw new IllegalArgumentException("No se pudo procesar la imagen. El archivo puede estar corrupto.");
        }

        if (w < profile.minWidth || h < profile.minHeight) {
            throw new IllegalArgumentException(
                    "La imagen es demasiado pequeña. Mínimo " + profile.minWidth + "×" + profile.minHeight + " px (recibido " + w + "×" + h + ").");
        }
        if (w > profile.maxWidth || h > profile.maxHeight) {
            throw new IllegalArgumentException(
                    "La imagen es demasiado grande. Máximo " + profile.maxWidth + "×" + profile.maxHeight + " px (recibido " + w + "×" + h + ").");
        }

        return format;
    }

    private DetectedFormat detectFormat(byte[] h) {
        if (h.length < 12) return null;
        // JPEG: FF D8 FF
        if ((h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8 && (h[2] & 0xFF) == 0xFF) {
            return DetectedFormat.JPEG;
        }
        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if ((h[0] & 0xFF) == 0x89 && h[1] == 'P' && h[2] == 'N' && h[3] == 'G'
                && (h[4] & 0xFF) == 0x0D && (h[5] & 0xFF) == 0x0A && (h[6] & 0xFF) == 0x1A && (h[7] & 0xFF) == 0x0A) {
            return DetectedFormat.PNG;
        }
        // GIF: "GIF87a" or "GIF89a"
        if (h[0] == 'G' && h[1] == 'I' && h[2] == 'F' && h[3] == '8'
                && (h[4] == '7' || h[4] == '9') && h[5] == 'a') {
            return DetectedFormat.GIF;
        }
        // WebP: "RIFF" .... "WEBP"
        if (h[0] == 'R' && h[1] == 'I' && h[2] == 'F' && h[3] == 'F'
                && h[8] == 'W' && h[9] == 'E' && h[10] == 'B' && h[11] == 'P') {
            return DetectedFormat.WEBP;
        }
        return null;
    }
}
