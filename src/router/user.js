const express = require('express');
const router = new express.Router();
const User = require('../models/user');
const auth = require('../middleware/auth');
const multer = require('multer');
const sharp = require('sharp');
const { sendWelcomeEmail, sendCancelationEmail } = require('../emails/account');

const upload = multer({
    limits: {
        fileSize: 1000000
    },
    fileFilter(req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
            return cb(new Error('Avatar must be an imagen png, jpg or jpeg.'));
        }
        cb(undefined, true);
    }
})

router.post('/users', async (req, res) => {
    const user = new User(req.body);
    try {
        await user.save();
        sendWelcomeEmail(user.email, user.name);
        const token = await user.generateAuthToken();
        res.status(201).send({ user, token });
    } catch (error) {
        res.status(400).send(error);
    }
});

router.post('/users/login', async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body.email, req.body.password);
        const token = await user.generateAuthToken();
        res.status(200).send({ user, token });
    } catch (error) {
        res.status(404).send({ error: 404, errorMessage: 'The user does not exist or the password is wrong.' });
    }
});

router.post('/users/logout', auth, async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter((token) => {
            return token.token !== req.token;
        });
        await req.user.save();
        res.status(200).send({ message: 'You are log off' });
    } catch (error) {
        res.status(404).send({ error: 400, errorMessage: error });
    }
});

router.post('/users/logoutAll', auth, async (req, res) => {
    try {
        req.user.tokens = [];
        await req.user.save();
        res.status(200).send({ message: 'You are log off of all sessions.' });
    } catch (error) {
        res.status(404).send({ error: 400, errorMessage: error });
    }
});

router.get('/users/me', auth, async (req, res) => {
    try {
        res.status(200).send(req.user);
    } catch (error) {
        res.status(500).send(error);
    }
});

router.post('/users/me/avatar', auth, upload.single('avatar'), async (req, res) => {
    try {
        const buffer = await sharp(req.file.buffer).resize({ width: 250, heigth: 250 }).png().toBuffer();
        req.user.avatar = buffer;
        await req.user.save();
        res.status(200).send({ message: 'The file was upload' });
    } catch (error) {
        res.status(500).send(error);
    }
}, (error, req, res, next) => {
    res.status(400).send({ error: error.message });
});

router.delete('/users/me/avatar', auth, async (req, res) => {
    try {
        req.user.avatar = undefined;
        await req.user.save();
        res.status(200).send({ message: 'The avatar was deleted.' });
    } catch (error) {
        res.status(500).send(error);
    }
});

router.get('/users/:id/avatar', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user && user.avatar) {
            res.set('Content-Type', 'image/png');
            res.status(200).send(user.avatar);
        } else {
            throw new Error('The user or the avatar does not exist.');
        }
    } catch (error) {
        res.status(500).send({ error: 'The user does not exist' });
    }
});

router.get('/users/:id', auth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            res.status(200).send(user);
        } else {
            res.status(404).send({ error: 404, message: 'User not found.' });
        }
    } catch (error) {
        res.status(500).send(error);
    }
});

router.patch('/users/me', auth, async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['name', 'email', 'password', 'age'];
    const isValidOperation = updates.every((update) => {
        return allowedUpdates.includes(update);
    });
    if (isValidOperation) {
        try {
            updates.forEach((update) => {
                req.user[update] = req.body[update];
            });
            await req.user.save();
            res.status(200).send(req.user);
        } catch (error) {
            res.status(500).send(error);
        }
    } else {
        res.status(400).send({ error: 400, errorMessage: 'Invalid updates.' });
    }
});

router.delete('/users/me', auth, async (req, res) => {
    try {
        req.user.remove();
        sendCancelationEmail(req.user.email, req.user.name);
        res.status(200).send(req.user);
    } catch (error) {
        res.status(500).send(error);
    }
});

module.exports = router;