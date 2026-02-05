import { Router } from 'express';
import { 
  getCertificates, 
  createCertificate, 
  updateCertificate, 
  deleteCertificate, 
  bulkIssueCertificates 
} from '../controllers/certificateController';

const router = Router();

router.get('/', getCertificates);
router.post('/', createCertificate);
router.post('/bulk', bulkIssueCertificates);
router.put('/:id', updateCertificate);
router.delete('/:id', deleteCertificate);

export default router;
