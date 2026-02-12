import { Request, Response } from 'express';
import prisma from '../prisma';
import { uploadToCloudinary, deleteFromCloudinary } from '../middleware/upload';

export const updateMyProfile = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId; // From authenticateToken
    const { firstName, lastName, phoneNumber, address, bio, dateOfBirth } = req.body;
    
    // Check if an image was uploaded (in memory buffer)
    let avatarUrl = undefined;
    if (req.file) {
      try {
        // 1. Get current profile to find old image URL
        const currentProfile = await prisma.profile.findUnique({
          where: { userId: userId }
        });

        // 2. Upload new image
        const result = await uploadToCloudinary(req.file.buffer, 'school-management-profiles');
        avatarUrl = result.secure_url;

        // 3. Delete old image from Cloudinary if it exists
        if (currentProfile?.avatar && currentProfile.avatar.includes('cloudinary.com')) {
          try {
            // Extract public_id from URL: /upload/(v[0-9]+/)?(folder/public_id)
            const parts = currentProfile.avatar.split('/upload/');
            if (parts.length > 1) {
              const pathWithPossibleVersion = parts[1]; // e.g. "v123456/folder/id.jpg" or "folder/id.jpg"
              const pathParts = pathWithPossibleVersion.split('/');
              
              // If it starts with 'v' and a number, it's a version, remove it
              if (pathParts[0].startsWith('v') && !isNaN(parseInt(pathParts[0].substring(1)))) {
                pathParts.shift();
              }
              
              // Join the rest and remove extension
              const publicIdWithExtension = pathParts.join('/');
              const publicId = publicIdWithExtension.substring(0, publicIdWithExtension.lastIndexOf('.'));
              
              console.log("Deleting old image with publicId:", publicId);
              await deleteFromCloudinary(publicId);
            }
          } catch (deleteErr) {
            console.error("Failed to delete old image from Cloudinary:", deleteErr);
            // We don't block the update if deletion fails, just log it
          }
        }
      } catch (uploadErr) {
        console.error("Cloudinary manual upload failed:", uploadErr);
        return res.status(500).json({ error: "Image upload failed" });
      }
    }

    // 1. Update basic User info
    await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
      }
    });

    // 2. Upsert (Update or Create) the Profile record
    // We construct the data object dynamically to only include defined fields if we want partial updates,
    // but upsert generally replaces or creates.
    
    await prisma.profile.upsert({
        where: { userId: userId },
        update: {
            phone: phoneNumber,
            address: address,
            bio: bio,
            ...(avatarUrl && { avatar: avatarUrl }),
            ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) })
        },
        create: {
            userId: userId,
            phone: phoneNumber,
            address: address,
            bio: bio,
            avatar: avatarUrl || "", // Default empty if not provided
            ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) })
        }
    });

    // 3. Return the updated user with profile
    const updatedUser = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            profile: true
        }
    });

    res.json({ success: true, user: updatedUser });

  } catch (err: any) {
    console.error("Profile update error:", err);
    console.error("Stack trace:", err.stack);
    res.status(500).json({ error: "Failed to update profile", details: err.message });
  }
};
