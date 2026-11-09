package com.shopnest;

import java.io.IOException;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Runs before every /api request:
 * - lets the live site (CORS_ORIGINS in .env) call the API from the shopper's browser
 * - tells the browser never to save (cache) an API answer
 * - answers 503 while the database is not connected
 */
@Component
public class ApiFilter extends OncePerRequestFilter {
	private final Settings settings;
	private final StartUp startUp;

	public ApiFilter(Settings settings, StartUp startUp) {
		this.settings = settings;
		this.startUp = startUp;
	}

	@Override
	protected boolean shouldNotFilter(HttpServletRequest request) {
		String path = request.getRequestURI();
		return !(path.equals("/api") || path.startsWith("/api/"));
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		String origin = request.getHeader("Origin");
		if (origin != null && settings.corsOrigins.contains(origin)) {
			response.setHeader("Access-Control-Allow-Origin", origin);
			response.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE");
			// ngrok-skip-browser-warning: the free ngrok link otherwise answers with a "you are about to visit" page
			response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, ngrok-skip-browser-warning");
			response.setHeader("Access-Control-Max-Age", "7200");
			response.setHeader("Vary", "Origin");
			if ("OPTIONS".equals(request.getMethod())) { // the browser asks first whether it may call the API
				response.setStatus(204);
				return;
			}
		}
		response.setHeader("Cache-Control", "no-store");
		if (!startUp.databaseReady()) {
			ShopApi.sendError(response, 503, "The database is not connected. See the server window.");
			return;
		}
		chain.doFilter(request, response);
	}
}
