package com.infotact.wms.barcode;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.BinaryBitmap;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.Result;
import com.google.zxing.client.j2se.BufferedImageLuminanceSource;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.common.HybridBinarizer;
import com.google.zxing.qrcode.QRCodeWriter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

@RestController
@RequestMapping("/api/barcodes")
@Tag(name = "Barcode/QR")
@PreAuthorize("isAuthenticated()")
public class BarcodeController {

    @PostMapping(value = "/qr", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> generateQrPng(
            @RequestParam("data") String data,
            @RequestParam(name = "size", defaultValue = "256") int size
    ) throws Exception {
        String payload = data == null ? "" : data.trim();
        if (payload.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        int s = Math.max(64, Math.min(size, 1024));

        QRCodeWriter writer = new QRCodeWriter();
        BitMatrix matrix = writer.encode(payload, BarcodeFormat.QR_CODE, s, s);

        BufferedImage image = MatrixToImageWriter.toBufferedImage(matrix);
        byte[] bytes = toPngBytes(image);

        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .contentType(MediaType.IMAGE_PNG)
                .body(bytes);
    }

    @PostMapping(value = "/decode", produces = MediaType.APPLICATION_JSON_VALUE)
    public DecodeResponse decode(@RequestParam("file") MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("file is required");
        }
        BufferedImage image;
        try {
            image = ImageIO.read(file.getInputStream());
        } catch (IOException e) {
            throw new IllegalArgumentException("Could not read image file");
        }
        if (image == null) {
            throw new IllegalArgumentException("Unsupported image format");
        }

        BinaryBitmap bitmap = new BinaryBitmap(new HybridBinarizer(new BufferedImageLuminanceSource(image)));
        Result result = new MultiFormatReader().decode(bitmap);
        return new DecodeResponse(result.getText(), result.getBarcodeFormat().toString());
    }

    private static byte[] toPngBytes(BufferedImage image) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(image, "PNG", baos);
        return baos.toByteArray();
    }

    public record DecodeResponse(String text, String format) {
    }
}

