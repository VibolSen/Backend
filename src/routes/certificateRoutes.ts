import { Router } from 'express';
import { 
  getCertificates, 
  getCertificateById,
  createCertificate, 
  updateCertificate, 
  deleteCertificate, 
  bulkIssueCertificates,
  downloadCertificate
} from '../controllers/certificateController';

const router = Router();

router.get('/', getCertificates);
router.get('/:id', getCertificateById);
router.get('/:id/download', downloadCertificate);
router.post('/', createCertificate);
router.post('/bulk', bulkIssueCertificates);
router.put('/:id', updateCertificate);
router.delete('/:id', deleteCertificate);

export default router;
