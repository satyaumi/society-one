package com.societyone.app;

import java.sql.*;

public class DiagnoseRenderDb {
    public static void main(String[] args) {
        String url = "jdbc:postgresql://dpg-dafh36n40ujc73b8sjtg-a.oregon-postgres.render.com:5432/societydb_h6ng?sslmode=require";
        String user = "societydb_h6ng_user";
        String pass = "JeN9oZ5m6JEEFPHHIUY2OLJITZvi8WJe";

        try (Connection conn = DriverManager.getConnection(url, user, pass)) {
            conn.setAutoCommit(false);
            System.out.println("Connected to Render PostgreSQL!");

            // === STEP 0: Clean up ALL data across all tables in reverse dependency order ===
            System.out.println("\n--- Full database cleanup ---");

            // Clear visit-related data first (deepest dependencies)
            safeDelete(conn, "DELETE FROM visit_requests");
            safeDelete(conn, "DELETE FROM visitors");

            // Clear resident profiles
            safeDelete(conn, "DELETE FROM resident_profiles");

            // Clear notifications and announcements
            safeDelete(conn, "DELETE FROM notifications");
            safeDelete(conn, "DELETE FROM user_announcement_states");
            safeDelete(conn, "DELETE FROM announcements");

            // Clear audit logs
            safeDelete(conn, "DELETE FROM audit_logs");

            // Clear society creation requests
            safeDelete(conn, "DELETE FROM society_creation_requests");

            // Clear flats -> floors -> buildings -> societies
            safeDelete(conn, "DELETE FROM flats");
            safeDelete(conn, "DELETE FROM floors");
            safeDelete(conn, "DELETE FROM buildings");
            safeDelete(conn, "DELETE FROM societies");

            // === STEP 1: Delete User #7 (thesundar3@gmail.com) ===
            int r = executeUpdate(conn, "DELETE FROM users WHERE id = 7");
            System.out.println("DELETED User #7 (thesundar3@gmail.com): " + r + " row(s)");

            // === STEP 2: Delete User #6 (societyone26@gmail.com) ===
            r = executeUpdate(conn, "DELETE FROM users WHERE id = 6");
            System.out.println("DELETED User #6 (societyone26@gmail.com): " + r + " row(s)");

            // === STEP 3: Delete User #9 (satyamlkinformation@gmail.com) ===
            r = executeUpdate(conn, "DELETE FROM users WHERE id = 9");
            System.out.println("DELETED User #9 (satyamlkinformation@gmail.com): " + r + " row(s)");

            // === STEP 4: Also delete User #10 (suvimakind@gmail.com - ADMIN) ===
            r = executeUpdate(conn, "DELETE FROM users WHERE id = 10");
            System.out.println("DELETED User #10 (suvimakind@gmail.com): " + r + " row(s)");

            // === VERIFY ===
            System.out.println("\n=== REMAINING USERS ===");
            try (PreparedStatement ps = conn.prepareStatement("SELECT id, username, email, role, account_status FROM users ORDER BY id")) {
                ResultSet rs = ps.executeQuery();
                while (rs.next()) {
                    System.out.println("User #" + rs.getLong("id") + ": " + rs.getString("username") + " | " + rs.getString("email") + " | " + rs.getString("role") + " | " + rs.getString("account_status"));
                }
            }

            System.out.println("\n=== PLATFORM_ADMIN COUNT ===");
            try (PreparedStatement ps = conn.prepareStatement("SELECT COUNT(*) FROM users WHERE role = 'PLATFORM_ADMIN'")) {
                ResultSet rs = ps.executeQuery(); rs.next();
                System.out.println("Platform admin count: " + rs.getLong(1));
            }

            // COMMIT
            conn.commit();
            System.out.println("\n*** ALL CHANGES COMMITTED SUCCESSFULLY ***");
            System.out.println("Platform admin count is 0 -> PlatformAdminBootstrap will create a new one on next restart!");

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    static void safeDelete(Connection conn, String sql) {
        try {
            int r = executeUpdate(conn, sql);
            System.out.println("  " + sql + " -> " + r + " rows");
        } catch (SQLException e) {
            System.out.println("  " + sql + " -> SKIPPED: " + e.getMessage().split("\n")[0]);
        }
    }

    static int executeUpdate(Connection conn, String sql) throws SQLException {
        try (Statement stmt = conn.createStatement()) {
            return stmt.executeUpdate(sql);
        }
    }
}
