package com.jjplatform.api.service;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.zip.CRC32;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Guards the header-first validation in {@link ImageValidator}: dimensions must be checked from the
 * image header, never by decoding the full raster. The critical case is the decompression bomb — a
 * tiny file that declares enormous dimensions — which must be rejected without the multi-GB
 * allocation the old {@code ImageIO.read()} path would have attempted.
 */
class ImageValidatorTest {

    private final ImageValidator validator = new ImageValidator();

    @Test
    void acceptsWellFormedImageWithinProfile() throws IOException {
        MockMultipartFile file = new MockMultipartFile(
                "file", "avatar.png", "image/png", realPng(800, 800));

        assertThat(validator.validate(file, ImageValidator.Profile.PROFILE))
                .isEqualTo(ImageValidator.DetectedFormat.PNG);
    }

    @Test
    void rejectsImageBelowMinimumDimensions() throws IOException {
        MockMultipartFile file = new MockMultipartFile(
                "file", "tiny.png", "image/png", realPng(100, 100)); // PROFILE.minWidth == 500

        assertThatThrownBy(() -> validator.validate(file, ImageValidator.Profile.PROFILE))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("demasiado pequeña");
    }

    @Test
    void rejectsOversizedRealImage() throws IOException {
        MockMultipartFile file = new MockMultipartFile(
                "file", "wide.png", "image/png", realPng(3500, 3500)); // PROFILE.maxWidth == 3000

        assertThatThrownBy(() -> validator.validate(file, ImageValidator.Profile.PROFILE))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("demasiado grande");
    }

    /**
     * The bomb: a PNG whose IHDR declares 40000x40000 (~6.4 GB if decoded to a raster) but which is
     * only a handful of bytes on disk. It must be rejected via the header dimension check. If the
     * validator ever falls back to decoding the raster, this test would OOM instead of throwing an
     * IllegalArgumentException.
     */
    @Test
    void rejectsDecompressionBombFromHeaderAlone() throws IOException {
        byte[] bomb = pngHeaderOnly(40000, 40000);
        assertThat(bomb.length).isLessThan(100); // trivially small on disk

        MockMultipartFile file = new MockMultipartFile("file", "bomb.png", "image/png", bomb);

        assertThatThrownBy(() -> validator.validate(file, ImageValidator.Profile.PROFILE))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("demasiado grande");
    }

    // --- helpers -----------------------------------------------------------------

    /** A genuine, decodable PNG of the given size (blank canvas — compresses to a few KB). */
    private static byte[] realPng(int w, int h) throws IOException {
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, "png", out);
        return out.toByteArray();
    }

    /**
     * A PNG signature + IHDR (+ IEND) declaring {@code w}x{@code h}, with no pixel data. Enough for an
     * ImageReader to report the dimensions, but nothing to decode.
     */
    private static byte[] pngHeaderOnly(int w, int h) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write(new byte[]{(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'});

        ByteArrayOutputStream ihdr = new ByteArrayOutputStream();
        ihdr.write(intBytes(w));
        ihdr.write(intBytes(h));
        ihdr.write(8); // bit depth
        ihdr.write(2); // color type: truecolor
        ihdr.write(0); // compression
        ihdr.write(0); // filter
        ihdr.write(0); // interlace
        writeChunk(out, "IHDR", ihdr.toByteArray());
        writeChunk(out, "IEND", new byte[0]);

        return out.toByteArray();
    }

    private static void writeChunk(ByteArrayOutputStream out, String type, byte[] data) throws IOException {
        byte[] typeBytes = type.getBytes("US-ASCII");
        out.write(intBytes(data.length));
        out.write(typeBytes);
        out.write(data);
        CRC32 crc = new CRC32();
        crc.update(typeBytes);
        crc.update(data);
        out.write(intBytes((int) crc.getValue()));
    }

    private static byte[] intBytes(int v) {
        return new byte[]{
                (byte) (v >>> 24), (byte) (v >>> 16), (byte) (v >>> 8), (byte) v};
    }
}
