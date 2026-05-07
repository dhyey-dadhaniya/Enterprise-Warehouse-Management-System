package com.infotact.wms.auth;

import com.infotact.wms.auth.dto.AuthResponse;
import com.infotact.wms.auth.dto.LoginRequest;
import com.infotact.wms.auth.dto.RegisterRequest;
import com.infotact.wms.auth.dto.RegisterResponse;
import com.infotact.wms.error.ConflictException;
import com.infotact.wms.security.JwtProperties;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import com.infotact.wms.security.JwtService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@SecurityRequirements
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final JwtProperties jwtProperties;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthController(
            AuthenticationManager authenticationManager,
            JwtService jwtService,
            JwtProperties jwtProperties,
            UserRepository userRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.jwtProperties = jwtProperties;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password())
        );
        UserDetails principal = (UserDetails) auth.getPrincipal();
        String token = jwtService.generateToken(principal);
        return ResponseEntity.ok(new AuthResponse(token, "Bearer", jwtProperties.expirationMs()));
    }

    /**
     * Self-service sign-up.
     * OPERATOR is allowed publicly; ADMIN requires an existing ADMIN bearer token.
     */
    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> register(
            @Valid @RequestBody RegisterRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        String username = request.username().trim();
        if (userRepository.existsByUsername(username)) {
            throw new ConflictException("Username already exists: " + username);
        }

        String roleName = request.role().trim().toUpperCase();
        boolean wantsAdmin = "ADMIN".equals(roleName);
        if (wantsAdmin && !isAdminBearerToken(authorization)) {
            throw new ConflictException("ADMIN sign-up requires an ADMIN token");
        }

        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new ConflictException(
                        "Role missing: " + roleName + ". Ensure DB migrations ran (Flyway)."
                ));

        User u = new User();
        u.setUsername(username);
        u.setPasswordHash(passwordEncoder.encode(request.password()));
        u.setEnabled(true);
        u.getRoles().add(role);
        userRepository.save(u);

        return ResponseEntity.status(201).body(new RegisterResponse("User registered successfully", username));
    }

    private boolean isAdminBearerToken(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return false;
        }
        try {
            String token = authorizationHeader.substring(7).trim();
            String username = jwtService.extractUsername(token);
            if (username == null || username.isBlank()) {
                return false;
            }
            User u = userRepository.findByUsername(username).orElse(null);
            if (u == null) {
                return false;
            }
            return u.getRoles().stream().anyMatch(r -> "ADMIN".equals(r.getName()));
        } catch (Exception ignored) {
            return false;
        }
    }
}
