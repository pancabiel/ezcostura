package com.ezcostura.desktop;

import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Profile("desktop")
public class SpaFallbackController {

    private static final Resource INDEX = new ClassPathResource("static/index.html");

    @GetMapping(value = {
        "/",
        "/{p1:[^.]+}",
        "/{p1:[^.]+}/{p2:[^.]+}",
        "/{p1:[^.]+}/{p2:[^.]+}/{p3:[^.]+}",
        "/{p1:[^.]+}/{p2:[^.]+}/{p3:[^.]+}/{p4:[^.]+}",
        "/{p1:[^.]+}/{p2:[^.]+}/{p3:[^.]+}/{p4:[^.]+}/{p5:[^.]+}"
    }, produces = MediaType.TEXT_HTML_VALUE)
    public Resource index() {
        return INDEX;
    }
}
