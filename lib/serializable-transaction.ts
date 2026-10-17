import 'server-only'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// Both issuance and refund reconciliation use this isolation level so that an
// early refund and a concurrent order cannot miss each other's writes.
export async function serializableTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    } catch (error) {
      if (attempt >= 3 || !(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2034') throw error
    }
  }
}
