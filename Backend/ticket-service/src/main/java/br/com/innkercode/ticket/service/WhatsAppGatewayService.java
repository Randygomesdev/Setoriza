package br.com.innkercode.ticket.service;

public interface WhatsAppGatewayService {

    /**
     * Envia uma mensagem de texto utilizando a API ativa do sistema (Evolution ou Meta).
     */
    String sendTextMessage(String number, String text);

    /**
     * Envia uma mensagem de mídia (imagem, documento) utilizando a API ativa do sistema.
     */
    String sendMediaMessage(String number, String mediaUrl, String mediatype, String mimetype, String filename, String caption);

    /**
     * Envia um áudio PTT utilizando a API ativa do sistema.
     */
    String sendWhatsAppAudio(String number, String mediaUrl);

    /**
     * Baixa os bytes de mídia recebidos via webhook do conector ativo.
     */
    byte[] downloadMedia(Object messageData, String mediaIdOrUrl);
}
