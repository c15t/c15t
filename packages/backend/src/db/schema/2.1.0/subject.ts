import { type Subject, subjectSchema } from '@c15t/schema';
import { subjectTable as previousSubjectTable } from '../2.0.0/subject';

export const subjectTable = previousSubjectTable.clone();

export { type Subject, subjectSchema };
