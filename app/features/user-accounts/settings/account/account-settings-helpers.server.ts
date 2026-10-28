import type { Return } from "@prisma/client/runtime/client";
import type { FileUpload } from "@remix-run/form-data-parser";

import { AVATAR_FOLDER } from "../../user-account-constants";
import type { requireAuthenticatedUserWithMembershipsExists } from "../../user-accounts-helpers.server";
import type { DangerZoneProps } from "./danger-zone";
import { OrganizationMembershipRole } from "~/generated/client";
import { uploadImage } from "~/utils/storage.server";

export function mapUserAccountWithMembershipsToDangerZoneProps(
  user: Awaited<
    Return<typeof requireAuthenticatedUserWithMembershipsExists>
  >["user"],
): DangerZoneProps {
  const imlicitlyDeletedOrganizations: string[] = [];
  const organizationsBlockingAccountDeletion: string[] = [];

  for (const membership of user.memberships) {
    // Only consider organizations where the user is an owner
    if (membership.role !== OrganizationMembershipRole.owner) {
      continue;
    }

    const memberCount = membership.organization._count.memberships;

    // If the user is the only member, the organization will be implicitly deleted
    if (memberCount === 1) {
      imlicitlyDeletedOrganizations.push(membership.organization.name);
    }
    // If there are other members, the organization blocks account deletion
    else {
      organizationsBlockingAccountDeletion.push(membership.organization.name);
    }
  }

  return {
    imlicitlyDeletedOrganizations,
    organizationsBlockingAccountDeletion,
  };
}
/**
 * Uploads a user's avatar to storage and returns its public URL.
 *
 * @param file - The avatar file to upload
 * @param userId - The ID of the user whose avatar is being uploaded
 * @returns The public URL of the uploaded avatar
 */
export async function uploadUserAvatar({
  file,
  userId,
}: {
  file: File | FileUpload;
  userId: string;
}) {
  return uploadImage({ file, folder: AVATAR_FOLDER, publicId: userId });
}
