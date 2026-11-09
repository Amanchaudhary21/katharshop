package com.katharshop;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * The Katharshop server, in Java (Spring Boot + MySQL).
 * It shows the store (the public folder) at http://localhost:8080 and runs the shop API at /api
 * (ShopApi), which keeps the products in the MySQL database (MySqlStore).
 *
 * Start it with start.bat in the main folder. Settings (MySQL password, owner password)
 * go in the .env file there; see .env.example.
 */
@SpringBootApplication
public class KatharshopApplication {
	public static void main(String[] args) {
		SpringApplication.run(KatharshopApplication.class, args);
	}
}
