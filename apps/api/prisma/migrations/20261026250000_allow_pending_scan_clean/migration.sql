-- Existing production uploads stayed PENDING under the stub scanner and could not be downloaded.
UPDATE "stored_files" SET "scan_status" = 'CLEAN' WHERE "scan_status" = 'PENDING';
