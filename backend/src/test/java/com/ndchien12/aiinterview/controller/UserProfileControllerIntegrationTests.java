package com.ndchien12.aiinterview.controller;

import com.ndchien12.aiinterview.entity.AuthProvider;
import com.ndchien12.aiinterview.entity.Role;
import com.ndchien12.aiinterview.entity.User;
import com.ndchien12.aiinterview.repository.UserRepository;
import com.ndchien12.aiinterview.security.JwtService;
import com.ndchien12.aiinterview.security.UserPrincipal;
import com.ndchien12.aiinterview.service.CloudinaryAvatarService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UserProfileControllerIntegrationTests {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @MockBean
    private CloudinaryAvatarService cloudinaryAvatarService;

    @Test
    void updatesProfile() throws Exception {
        User user = createUser(AuthProvider.LOCAL, true);

        mockMvc.perform(put("/api/users/me")
                        .header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Updated User",
                                  "headline": "Flashcard learner"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated User"))
                .andExpect(jsonPath("$.headline").value("Flashcard learner"));
    }

    @Test
    void changesLocalPasswordAndRejectsWrongCurrentPassword() throws Exception {
        User user = createUser(AuthProvider.LOCAL, true);

        mockMvc.perform(put("/api/users/me/password")
                        .header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "currentPassword": "Wrong123!",
                                  "newPassword": "NewPassword123!"
                                }
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Current password is incorrect"));

        mockMvc.perform(put("/api/users/me/password")
                        .header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "currentPassword": "Password123!",
                                  "newPassword": "NewPassword123!"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.passwordSet").value(true))
                .andExpect(jsonPath("$.authProvider").value("LOCAL"));
    }

    @Test
    void setsPasswordForGoogleOnlyUserWithoutCurrentPassword() throws Exception {
        User user = createUser(AuthProvider.GOOGLE, false);

        mockMvc.perform(put("/api/users/me/password")
                        .header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "newPassword": "GooglePassword123!"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.passwordSet").value(true))
                .andExpect(jsonPath("$.authProvider").value("LOCAL_AND_GOOGLE"));
    }

    @Test
    void uploadsAndRemovesAvatar() throws Exception {
        User user = createUser(AuthProvider.LOCAL, true);
        when(cloudinaryAvatarService.uploadAvatar(any(), any()))
                .thenReturn(new CloudinaryAvatarService.AvatarUploadResult(
                        "https://res.cloudinary.com/demo/image/upload/profile-avatar.webp",
                        "freecard/users/%s/avatar/profile-avatar".formatted(user.getId())
                ));

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "avatar.webp",
                "image/webp",
                "avatar".getBytes()
        );

        mockMvc.perform(multipart("/api/users/me/avatar")
                        .file(file)
                        .header("Authorization", bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatarUrl").value("https://res.cloudinary.com/demo/image/upload/profile-avatar.webp"));

        mockMvc.perform(delete("/api/users/me/avatar")
                        .header("Authorization", bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatarUrl").value(nullValue()));
    }

    private User createUser(AuthProvider authProvider, boolean passwordSet) {
        User user = new User();
        user.setName("Profile User");
        user.setEmail("profile-%s@example.com".formatted(UUID.randomUUID()));
        user.setPasswordHash(passwordEncoder.encode("Password123!"));
        user.setHeadline("FreeCard learner");
        user.setAuthProvider(authProvider);
        user.setPasswordSet(passwordSet);
        user.setRole(Role.USER);
        return userRepository.save(user);
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.generateToken(UserPrincipal.from(user));
    }
}
