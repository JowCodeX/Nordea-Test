import { Router, Request, Response } from 'express'; // Import Request and Response types
const testRouter = Router();

testRouter.get('/test', (req: Request, res: Response) => { // Explicitly type req and res
res.send('Test route works');
});

export default testRouter;