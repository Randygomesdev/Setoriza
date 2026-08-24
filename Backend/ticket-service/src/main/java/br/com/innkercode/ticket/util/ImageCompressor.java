package br.com.innkercode.ticket.util;

import lombok.extern.slf4j.Slf4j;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Slf4j
public class ImageCompressor {

    private static final int MAX_WIDTH = 1920;
    private static final float COMPRESSION_QUALITY = 0.80f;

    public static byte[] compressImage(byte[] imageBytes, String contentType) {
        if (contentType == null || (!contentType.contains("image/jpeg") && !contentType.contains("image/png"))) {
            return imageBytes; // Retorna os bytes originais se não for JPEG ou PNG
        }

        try {
            ByteArrayInputStream bais = new ByteArrayInputStream(imageBytes);
            BufferedImage originalImage = ImageIO.read(bais);
            if (originalImage == null) {
                log.warn("Falha ao ler imagem para compressão.");
                return imageBytes;
            }

            int originalWidth = originalImage.getWidth();
            int originalHeight = originalImage.getHeight();

            BufferedImage resizedImage = originalImage;
            if (originalWidth > MAX_WIDTH) {
                int targetWidth = MAX_WIDTH;
                int targetHeight = (originalHeight * MAX_WIDTH) / originalWidth;

                resizedImage = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_RGB);
                Graphics2D g = resizedImage.createGraphics();
                g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
                g.drawImage(originalImage, 0, 0, targetWidth, targetHeight, null);
                g.dispose();
                log.info("Imagem redimensionada de {}x{} para {}x{}", originalWidth, originalHeight, targetWidth, targetHeight);
            } else if (originalImage.getType() != BufferedImage.TYPE_INT_RGB) {
                // Se não redimensionar, mas tiver canal alfa (transparência de PNG), precisamos converter para RGB puro (sem alfa)
                resizedImage = new BufferedImage(originalWidth, originalHeight, BufferedImage.TYPE_INT_RGB);
                Graphics2D g = resizedImage.createGraphics();
                g.setColor(Color.WHITE);
                g.fillRect(0, 0, originalWidth, originalHeight);
                g.drawImage(originalImage, 0, 0, null);
                g.dispose();
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
            ImageWriteParam param = writer.getDefaultWriteParam();
            param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionQuality(COMPRESSION_QUALITY);

            try (ImageOutputStream ios = ImageIO.createImageOutputStream(baos)) {
                writer.setOutput(ios);
                writer.write(null, new IIOImage(resizedImage, null, null), param);
            } finally {
                writer.dispose();
            }

            byte[] compressedBytes = baos.toByteArray();
            log.info("Imagem comprimida com sucesso. Tamanho original: {} KB, Novo tamanho: {} KB (Redução de {}%)",
                    imageBytes.length / 1024,
                    compressedBytes.length / 1024,
                    100 - (compressedBytes.length * 100 / imageBytes.length));

            return compressedBytes;
        } catch (IOException e) {
            log.error("Erro durante a compressão da imagem: {}", e.getMessage(), e);
            return imageBytes;
        }
    }

    public static String getNewContentType(String contentType) {
        if (contentType != null && (contentType.contains("image/jpeg") || contentType.contains("image/png"))) {
            return "image/jpeg";
        }
        return contentType;
    }

    public static String sanitizeFilename(String filename) {
        if (filename == null) {
            return "file";
        }
        String name = filename;
        String extension = "";
        int dotIndex = filename.lastIndexOf('.');
        if (dotIndex > 0) {
            name = filename.substring(0, dotIndex);
            extension = filename.substring(dotIndex);
        }
        
        String normalized = java.text.Normalizer.normalize(name, java.text.Normalizer.Form.NFD);
        String denormalized = normalized.replaceAll("\\p{M}", "");
        String sanitized = denormalized.replaceAll("[^a-zA-Z0-9\\-_]", "_");
        
        return sanitized + extension.replaceAll("[^a-zA-Z0-9.]", "");
    }

    public static String getNewFilename(String originalFilename) {
        String filename = originalFilename;
        if (originalFilename != null && (originalFilename.toLowerCase().endsWith(".png") || originalFilename.toLowerCase().endsWith(".jpeg") || originalFilename.toLowerCase().endsWith(".jpg"))) {
            int dotIndex = originalFilename.lastIndexOf('.');
            if (dotIndex > 0) {
                filename = originalFilename.substring(0, dotIndex) + ".jpg";
            }
        }
        return sanitizeFilename(filename);
    }
}
