import { Injectable } from '@nestjs/common';
import type { Profile } from '@prisma/client';
import type { updateProfileSchema } from '@thesispartner/validation';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import { cleared } from '../common/dates';
import { AppException } from '../common/errors/app.exception';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { clientAvatarPath, isStorageRef } from '../storage/profile-file-rules';

type UpdateProfileBody = z.infer<typeof updateProfileSchema>;

export type AcademicProfile = {
  givenName: string;
  familyName: string;
  displayName: string;
  academicTitle: string | null;
  institution: string | null;
  laboratory: string | null;
  doctoralSchool: string | null;
  specialty: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  orcid: string | null;
  avatarUrl: string | null;
  cvUrl: string | null;
  googleScholarUrl: string | null;
  linkedinUrl: string | null;
};

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async get(userId: string): Promise<AcademicProfile> {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    return presentAcademicProfile(toAcademicProfile(profile), userId, true);
  }

  async update(
    userId: string,
    body: UpdateProfileBody,
    requestId?: string,
  ): Promise<AcademicProfile> {
    const current = await this.prisma.profile.findUnique({ where: { userId } });
    if (!current) throw new AppException(404, 'NOT_FOUND', 'Resource not found');

    const data = {
      givenName: body.givenName,
      familyName: body.familyName,
      academicTitle: cleared(body.academicTitle),
      institution: cleared(body.institution),
      laboratory: cleared(body.laboratory),
      doctoralSchool: cleared(body.doctoralSchool),
      specialty: cleared(body.specialty),
      city: cleared(body.city),
      country: cleared(body.country),
      phone: cleared(body.phone),
      orcid: cleared(body.orcid),
      avatarUrl: cleared(body.avatarUrl),
      cvUrl: cleared(body.cvUrl),
      googleScholarUrl: cleared(body.googleScholarUrl),
      linkedinUrl: cleared(body.linkedinUrl),
    };
    const changes = Object.fromEntries(
      Object.entries(data).filter((entry) => entry[1] !== undefined),
    ) as Partial<AcademicProfile>;
    const givenName = changes.givenName ?? current.givenName;
    const familyName = changes.familyName ?? current.familyName;

    if (Object.keys(changes).length === 0) {
      return presentAcademicProfile(toAcademicProfile(current), userId, true);
    }

    const profile = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.profile.update({
        where: { userId },
        data: {
          ...changes,
          displayName: `${givenName} ${familyName}`.slice(0, 160),
        },
      });
      await this.audit.record(tx, {
        actorId: userId,
        action: 'profile.update',
        entityType: 'profile',
        entityId: updated.id,
        requestId,
      });
      return updated;
    });
    return presentAcademicProfile(toAcademicProfile(profile), userId, true);
  }
}

export function presentAcademicProfile(
  profile: AcademicProfile,
  userId: string,
  isSelf: boolean,
): AcademicProfile {
  return {
    ...profile,
    avatarUrl: resolveAvatarUrl(userId, profile.avatarUrl, isSelf),
    cvUrl: isStorageRef(profile.cvUrl)
      ? isSelf
        ? '/api/v1/profile/cv/download'
        : null
      : profile.cvUrl,
  };
}

export function resolveAvatarUrl(
  userId: string,
  avatarUrl: string | null | undefined,
  isSelf = false,
): string | null {
  if (!avatarUrl) return null;
  if (isStorageRef(avatarUrl)) return clientAvatarPath(userId, isSelf);
  return avatarUrl;
}

export function toAcademicProfile(profile: Profile): AcademicProfile {
  return {
    givenName: profile.givenName,
    familyName: profile.familyName,
    displayName: profile.displayName,
    academicTitle: profile.academicTitle,
    institution: profile.institution,
    laboratory: profile.laboratory,
    doctoralSchool: profile.doctoralSchool,
    specialty: profile.specialty,
    city: profile.city,
    country: profile.country,
    phone: profile.phone,
    orcid: profile.orcid,
    avatarUrl: profile.avatarUrl,
    cvUrl: profile.cvUrl,
    googleScholarUrl: profile.googleScholarUrl,
    linkedinUrl: profile.linkedinUrl,
  };
}
