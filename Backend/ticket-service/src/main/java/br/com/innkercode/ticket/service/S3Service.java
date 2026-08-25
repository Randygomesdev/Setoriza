package br.com.innkercode.ticket.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class S3Service {

    private final S3Client s3Client;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    @Value("${aws.s3.endpoint}")
    private String endpoint;

    public String uploadFile(String originalFilename, byte[] bytes, String contentType) {
        String fileKey = UUID.randomUUID() + "_" + originalFilename;
        try {
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(fileKey)
                    .contentType(contentType)
                    .build();

            s3Client.putObject(putObjectRequest, RequestBody.fromBytes(bytes));
            log.info("Arquivo enviado com sucesso para o MinIO S3: {}", fileKey);

            // URL pública do MinIO local
            return endpoint + "/" + bucketName + "/" + fileKey;
        } catch (Exception e) {
            log.error("Erro ao enviar arquivo para o MinIO S3", e);
            throw new RuntimeException("Erro ao fazer upload de arquivo para o MinIO", e);
        }
    }

    public software.amazon.awssdk.core.ResponseBytes<software.amazon.awssdk.services.s3.model.GetObjectResponse> downloadFileResponse(String fileKey) {
        try {
            software.amazon.awssdk.services.s3.model.GetObjectRequest getObjectRequest = 
                software.amazon.awssdk.services.s3.model.GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(fileKey)
                    .build();
            return s3Client.getObjectAsBytes(getObjectRequest);
        } catch (Exception e) {
            log.error("Erro ao baixar arquivo do MinIO S3: {}", fileKey, e);
            throw new RuntimeException("Erro ao baixar arquivo do MinIO", e);
        }
    }
}
