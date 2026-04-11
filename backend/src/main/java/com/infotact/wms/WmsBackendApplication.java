package com.infotact.wms;

import com.infotact.wms.security.JwtProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(JwtProperties.class)
public class WmsBackendApplication {
    public static void main(String[] args) {
        SpringApplication.run(WmsBackendApplication.class, args);
    }
}

