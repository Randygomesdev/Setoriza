package br.com.innkercode.ticket.dto.gemini;

import java.util.List;
import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record GeminiRequest(
    List<Content> contents,
    SystemInstruction systemInstruction,
    GenerationConfig generationConfig
) {
    public record Content(List<Part> parts) {}
    public record SystemInstruction(List<Part> parts) {}
    public record Part(String text) {}
    
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record GenerationConfig(
        Double temperature,
        Integer maxOutputTokens,
        String responseMimeType
    ) {}
}
