package com.jjplatform.api.service;

import com.jjplatform.api.exception.ResourceNotFoundException;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FileStorageService {

    private final ImageValidator imageValidator;
    private Path uploadDir;

    @Value("${app.file.upload-dir}")
    private String uploadDirRaw;

    @PostConstruct
    public void init() throws IOException {
        this.uploadDir = Paths.get(uploadDirRaw).toAbsolutePath().normalize();
        Files.createDirectories(uploadDir);
    }

    public String store(MultipartFile file, ImageValidator.Profile profile) throws IOException {
        ImageValidator.DetectedFormat format = imageValidator.validate(file, profile);

        // Use the detected format's extension, not the client-supplied filename — the latter can lie.
        String filename = UUID.randomUUID() + format.extension;
        Path targetLocation = uploadDir.resolve(filename).normalize();

        // Defense-in-depth: even with a UUID filename, refuse anything outside uploadDir.
        if (!targetLocation.startsWith(uploadDir)) {
            throw new IllegalArgumentException("Invalid file path");
        }

        Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
        return filename;
    }

    public Resource load(String filename) {
        try {
            if (!filename.matches("[a-zA-Z0-9._-]+")) {
                throw new ResourceNotFoundException("File not found");
            }

            Path filePath = uploadDir.resolve(filename).normalize();

            if (!filePath.startsWith(uploadDir)) {
                throw new ResourceNotFoundException("File not found");
            }

            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            }
            throw new ResourceNotFoundException("File not found: " + filename);
        } catch (MalformedURLException e) {
            throw new ResourceNotFoundException("File not found: " + filename);
        }
    }

    public void delete(String filename) throws IOException {
        if (!filename.matches("[a-zA-Z0-9._-]+")) {
            throw new IllegalArgumentException("Invalid filename");
        }
        Path filePath = uploadDir.resolve(filename).normalize();
        if (!filePath.startsWith(uploadDir)) {
            throw new IllegalArgumentException("Invalid file path");
        }
        Files.deleteIfExists(filePath);
    }

    /** Maps a stored filename to its MIME type using the extension we assigned at upload time. */
    public String contentTypeFor(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".gif")) return "image/gif";
        if (lower.endsWith(".webp")) return "image/webp";
        return "image/jpeg";
    }
}
