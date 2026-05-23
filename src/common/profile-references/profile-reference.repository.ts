import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class ProfileReferenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveCampusById(campusId: number) {
    return this.prisma.msCampus.findFirst({
      where: { CampusID: campusId, Stsrc: 'A' },
    });
  }

  findActiveDepartmentById(departmentId: number) {
    return this.prisma.msDepartment.findFirst({
      where: { DepartmentID: departmentId, Stsrc: 'A' },
    });
  }

  findActiveHobbiesByIds(hobbyIds: number[]) {
    return this.prisma.msHobby.findMany({
      where: { HobbyID: { in: hobbyIds }, Stsrc: 'A' },
      select: { HobbyID: true },
    });
  }
}
