import express from 'express';

const router = express.Router();


router.post('/user', (req, res) => {
    const { name, email } = req.body;
    // Perform user creation logic here
    res.status(201).json({ message: 'User created successfully', user: { name, email } });
}
);