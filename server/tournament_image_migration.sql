-- Migration: Add image_url column to TOURNAMENTS table
ALTER TABLE TOURNAMENTS ADD COLUMN image_url VARCHAR(512) NULL;
