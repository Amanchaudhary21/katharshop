package com.shopnest;

import java.util.Map;

import org.springframework.boot.web.server.MimeMappings;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.boot.web.server.servlet.ConfigurableServletWebServerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Shows the store itself: every file in the public folder, and index.html at http://localhost:8080/ */
@Configuration
public class WebConfig implements WebMvcConfigurer {
	private final Settings settings;

	public WebConfig(Settings settings) {
		this.settings = settings;
	}

	@Override
	public void addResourceHandlers(ResourceHandlerRegistry registry) {
		registry.addResourceHandler("/**")
				.addResourceLocations(settings.publicDir.toUri().toString())
				.setCacheControl(CacheControl.noStore()); // always the newest files while you edit
	}

	@Override
	public void addViewControllers(ViewControllerRegistry registry) {
		registry.addViewController("/").setViewName("forward:/index.html");
	}

	/** manifest.webmanifest (the installed app's name and icons) is sent as a web app manifest */
	@Bean
	WebServerFactoryCustomizer<ConfigurableServletWebServerFactory> manifestFileType() {
		return server -> server.addMimeMappings(new MimeMappings(Map.of("webmanifest", "application/manifest+json")));
	}
}
