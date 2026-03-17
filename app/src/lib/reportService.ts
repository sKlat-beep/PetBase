import {
  collection, doc, getDoc, getDocs, increment, writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { createNotification } from './firestoreService';
import type { GroupMember } from '../contexts/CommunityContext';

export interface Report {
  id: string;
  reporterUid: string;
  targetType: 'user' | 'post' | 'comment' | 'dm' | 'event_post';
  targetId: string;
  groupId?: string;
  parentPostId?: string; // not persisted — used only for comment flagCount path
  reason: string;
  detail?: string;
  createdAt: number;
  status: 'pending' | 'reviewed' | 'dismissed';
}

export async function submitReport(
  report: Omit<Report, 'id' | 'createdAt' | 'status'>,
): Promise<void> {
  const { parentPostId, ...reportForFirestore } = report;

  // Atomically write the report document and flag the target in a single batch
  const batch = writeBatch(db);

  const reportRef = doc(collection(db, 'reports'));
  batch.set(reportRef, {
    ...reportForFirestore,
    createdAt: Date.now(),
    status: 'pending',
  });

  // Increment flagCount and set isFlagged on the target document
  if (report.targetType === 'post' && report.groupId) {
    const postRef = doc(db, 'groups', report.groupId, 'posts', report.targetId);
    batch.update(postRef, {
      flagCount: increment(1),
      isFlagged: true,
    });
  } else if (report.targetType === 'comment' && report.groupId && parentPostId) {
    const commentRef = doc(
      db,
      'groups', report.groupId,
      'posts', parentPostId,
      'comments', report.targetId,
    );
    batch.update(commentRef, {
      flagCount: increment(1),
      isFlagged: true,
    });
  }

  await batch.commit();

  // Notify group Owners and Moderators when group content is reported
  if (report.groupId) {
    try {
      const groupSnap = await getDoc(doc(db, 'groups', report.groupId));
      if (!groupSnap.exists()) return;

      // Fetch members subcollection to find Owners and Moderators
      const membersSnap = await getDocs(
        collection(db, 'groups', report.groupId, 'members'),
      );

      const notifyUids: string[] = [];
      membersSnap.docs.forEach(d => {
        const member = d.data() as GroupMember;
        if (member.role === 'Owner' || member.role === 'Moderator') {
          notifyUids.push(d.id);
        }
      });

      const groupName = groupSnap.data().name ?? report.groupId;
      await Promise.all(
        notifyUids.map(uid =>
          createNotification(uid, {
            type: 'report_action',
            message: `A ${report.targetType} in "${groupName}" has been reported for "${report.reason}".`,
            targetId: report.targetId,
            targetType: report.targetType,
            read: false,
            createdAt: Date.now(),
          }),
        ),
      );
    } catch {
      // Notification failure is non-fatal — report is already written
    }
  }
}
