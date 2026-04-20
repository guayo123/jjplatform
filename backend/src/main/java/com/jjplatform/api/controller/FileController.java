package com.jjplatform.api.controller;

import com.jjplatform.api.model.Academy;
import com.jjplatform.api.model.Photo;
import com.jjplatform.api.repository.AcademyRepository;
import com.jjplatform.api.repository.PhotoRepository;
import com.jjplatform.api.service.FileStorageService;
import com.jjplatform.api.service.SecurityHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private final FileStorageService fileStorageService;
    private final PhotoRepository photoRepository;
    private final AcademyRepository academyRepository;
    private final SecurityHelper securityHelper;

    @PostMapping("/upload")
    public ResponseEntity<Map<String, String>> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "caption", required = false) String caption) throws IOException {

        Long academyId = securityHelper.getCurrentAcademyId();

        String filename = fileStorageService.store(file);
        String fileUrl = "/api/files/" + filename;

        // Save photo reference
        Photo photo = Photo.builder()
                .academy(academyRepository.findById(academyId).orElseThrow())
                .url(fileUrl)
                .caption(caption)
                .build();
        photoRepository.save(photo);

        return ResponseEntity.ok(Map.of("url", fileUrl, "filename", filename));
    }

    @GetMapping("/{filename}")
    public ResponseEntity<Resource> download(@PathVariable String filename) {
        Resource resource = fileStorageService.load(filename);
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_JPEG)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }

    @DeleteMapping("/photos/{id}")
    public ResponseEntity<Void> deletePhoto(@PathVariable Long id) throws IOException {
        Long academyId = securityHelper.getCurrentAcademyId();
        Photo photo = photoRepository.findById(id)
                .orElse(null);
        if (photo == null || !photo.getAcademy().getId().equals(academyId)) {
            return ResponseEntity.notFound().build();
        }
        // Extract filename from URL (/api/files/{filename})
        String url = photo.getUrl();
        String filename = url.substring(url.lastIndexOf('/') + 1);
        fileStorageService.delete(filename);
        photoRepository.delete(photo);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/logo")
    public ResponseEntity<Map<String, String>> uploadLogo(
            @RequestParam("file") MultipartFile file) throws IOException {
        Long academyId = securityHelper.getCurrentAcademyId();
        Academy academy = academyRepository.findById(academyId).orElseThrow();

        // Delete old logo file if present
        if (academy.getLogoUrl() != null) {
            String oldFilename = academy.getLogoUrl().substring(academy.getLogoUrl().lastIndexOf('/') + 1);
            try { fileStorageService.delete(oldFilename); } catch (IOException ignored) { }
        }

        String filename = fileStorageService.store(file);
        String fileUrl = "/api/files/" + filename;
        academy.setLogoUrl(fileUrl);
        academyRepository.save(academy);

        return ResponseEntity.ok(Map.of("url", fileUrl));
    }
}
