package com.societyone.app.resident.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;

public record AdminChangeRequest(
        @JsonAlias("adminNotes")
        @NotBlank(message = "Notes/reason are required")
        String notes
) {}
