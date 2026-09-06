package com.societyone.app.visitor.dto;

import com.societyone.app.visitor.entity.VisitorType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record VisitorCreateRequest(

        @NotBlank
        @Size(max = 150)
        String fullName,

        @NotBlank
        @Size(max = 30)
        String mobileNumber,

        @NotNull
        VisitorType visitorType,

        @Size(max = 30)
        String vehicleNumber
) {
}