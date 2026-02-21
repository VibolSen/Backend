import { Request, Response } from 'express';
import prisma from '../prisma';
import { uploadToCloudinary, deleteFromCloudinary, getPublicIdFromUrl } from '../middleware/upload';

export const updateMyProfile = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    console.log(`[ProfileController] Updating profile for user: ${userId}`);
    
    // Support both phoneNumber and phone from frontend
    const { firstName, lastName, phoneNumber, phone, address, bio, dateOfBirth } = req.body;
    const finalPhone = phoneNumber || phone;
    
    // Check if an image was uploaded
    let avatarUrl = undefined;
    if (req.file) {
      try {
        console.log(`[ProfileController] File detected: ${req.file.originalname} (${req.file.size} bytes)`);
        
        // 1. Get current profile to find old image URL
        const currentProfile = await prisma.profile.findUnique({
          where: { userId: userId }
        });

        // 2. Upload new image
        const result = await uploadToCloudinary(req.file.buffer, 'school-management-profiles');
        avatarUrl = result.secure_url;
        console.log(`[ProfileController] Uploaded to Cloudinary: ${avatarUrl}`);

        // 3. Delete old image from Cloudinary if it exists
        if (currentProfile?.avatar) {
          const publicId = getPublicIdFromUrl(currentProfile.avatar);
          if (publicId) {
            console.log(`[ProfileController] Deleting old image with publicId: ${publicId}`);
            await deleteFromCloudinary(publicId).catch(err => {
               console.error(`[ProfileController] Cloudinary deletion error:`, err.message);
            });
          }
        }
      } catch (uploadErr: any) {
        console.error("[ProfileController] Cloudinary upload failed:", uploadErr);
        return res.status(500).json({ error: "Image upload failed", details: uploadErr.message });
      }
    }

    // 1. Update basic User info
    await prisma.user.update({
      where: { id: userId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
      }
    });

    // 2. Upsert (Update or Create) the Profile record
    const profileData: any = {
        ...(finalPhone !== undefined && { phone: finalPhone }),
        ...(address !== undefined && { address }),
        ...(bio !== undefined && { bio }),
        ...(avatarUrl && { avatar: avatarUrl }),
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) })
    };

    console.log(`[ProfileController] Upserting profile data:`, Object.keys(profileData));

    await prisma.profile.upsert({
        where: { userId: userId },
        update: profileData,
        create: {
            userId: userId,
            ...profileData,
            avatar: avatarUrl || ""
        }
    });

    // 3. Return the updated user with profile
    const updatedUser = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            profile: true
        }
    });

    console.log(`[ProfileController] Update successful for ${updatedUser?.email}`);
    res.json({ success: true, user: updatedUser });

  } catch (err: any) {
    console.error("[ProfileController] Error:", err);
    res.status(500).json({ error: "Failed to update profile", details: err.message });
  }
};
