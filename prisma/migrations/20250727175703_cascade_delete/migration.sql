-- DropForeignKey
ALTER TABLE "AudioVersion" DROP CONSTRAINT "AudioVersion_trackId_fkey";

-- AddForeignKey
ALTER TABLE "AudioVersion" ADD CONSTRAINT "AudioVersion_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;
