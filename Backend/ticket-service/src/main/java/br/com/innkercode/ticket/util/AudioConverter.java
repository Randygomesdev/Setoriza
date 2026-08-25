package br.com.innkercode.ticket.util;

import lombok.extern.slf4j.Slf4j;
import java.io.File;
import java.nio.file.Files;

@Slf4j
public class AudioConverter {

    public static byte[] convertWebmToOgg(byte[] webmBytes) {
        log.info("Iniciando conversão de áudio WebM para OGG Opus via ffmpeg...");
        File inputFile = null;
        File outputFile = null;
        try {
            // 1. Criar arquivos temporários
            inputFile = File.createTempFile("voice_input_", ".webm");
            outputFile = File.createTempFile("voice_output_", ".ogg");

            // 2. Escrever bytes de entrada
            Files.write(inputFile.toPath(), webmBytes);

            // 3. Executar o ffmpeg
            ProcessBuilder pb = new ProcessBuilder(
                "ffmpeg", "-y", 
                "-i", inputFile.getAbsolutePath(), 
                "-c:a", "libopus", 
                outputFile.getAbsolutePath()
            );
            pb.redirectErrorStream(true);
            Process process = pb.start();
            
            // Aguardar término do processo
            int exitCode = process.waitFor();
            if (exitCode != 0) {
                log.error("ffmpeg falhou com código de saída {}", exitCode);
                return webmBytes; // Fallback para os bytes originais se falhar
            }

            // 4. Ler bytes de saída
            byte[] oggBytes = Files.readAllBytes(outputFile.toPath());
            log.info("Áudio convertido com sucesso! Novo tamanho: {} bytes", oggBytes.length);
            return oggBytes;

        } catch (Exception e) {
            log.error("Erro durante a conversão do áudio ffmpeg", e);
            return webmBytes; // Fallback
        } finally {
            // 5. Limpar arquivos temporários
            if (inputFile != null && inputFile.exists()) {
                inputFile.delete();
            }
            if (outputFile != null && outputFile.exists()) {
                outputFile.delete();
            }
        }
    }
}
