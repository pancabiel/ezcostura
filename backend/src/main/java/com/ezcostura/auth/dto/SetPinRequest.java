package com.ezcostura.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record SetPinRequest(
    @NotBlank
    @Pattern(regexp = "\\d{4,6}", message = "O PIN deve ter de 4 a 6 dígitos")
    String pin
) {}
