package com.societyone.app;

import java.sql.*;

public class InspectRequest6 {
    public static void main(String[] args) {
        String url = "jdbc:postgresql://dpg-dafh36n40ujc73b8sjtg-a.oregon-postgres.render.com:5432/societydb_h6ng?sslmode=require";
        String user = "societydb_h6ng_user";
        String pass = "JeN9oZ5m6JEEFPHHIUY2OLJITZvi8WJe";

        try (Connection conn = DriverManager.getConnection(url, user, pass)) {
            System.out.println("=== REQUEST #6 ===");
            try (PreparedStatement ps = conn.prepareStatement("SELECT * FROM society_creation_requests WHERE id = 6")) {
                ResultSet rs = ps.executeQuery();
                ResultSetMetaData md = rs.getMetaData();
                if (rs.next()) {
                    for (int i = 1; i <= md.getColumnCount(); i++) {
                        System.out.println(md.getColumnName(i) + ": " + rs.getObject(i));
                    }
                } else {
                    System.out.println("Request 6 not found! Listing all requests:");
                    try (Statement st = conn.createStatement(); ResultSet rs2 = st.executeQuery("SELECT id, reference_code, society_name, primary_contact_email, primary_contact_phone, status FROM society_creation_requests")) {
                        while (rs2.next()) {
                            System.out.println("Req #" + rs2.getLong("id") + " " + rs2.getString("reference_code") + " " + rs2.getString("society_name") + " " + rs2.getString("primary_contact_email") + " " + rs2.getString("status"));
                        }
                    }
                }
            }

            System.out.println("\n=== USERS ===");
            try (Statement st = conn.createStatement(); ResultSet rs = st.executeQuery("SELECT id, username, email, mobile_number, role, account_status FROM users")) {
                while (rs.next()) {
                    System.out.println("User #" + rs.getLong("id") + ": " + rs.getString("username") + " | " + rs.getString("email") + " | " + rs.getString("mobile_number") + " | " + rs.getString("role"));
                }
            }

            System.out.println("\n=== SOCIETIES ===");
            try (Statement st = conn.createStatement(); ResultSet rs = st.executeQuery("SELECT id, name, owner_user_id, status FROM societies")) {
                while (rs.next()) {
                    System.out.println("Society #" + rs.getLong("id") + ": " + rs.getString("name") + " | owner: " + rs.getLong("owner_user_id"));
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
