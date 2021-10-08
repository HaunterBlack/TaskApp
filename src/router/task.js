const express = require('express');
const router = new express.Router();
const Task = require('../models/task');
const auth = require('../middleware/auth');

router.post('/tasks', auth, async (req, res) => {
    const task = new Task({
        ...req.body,
        owner: req.user._id
    });
    try {
        await task.save();
        res.status(201).send(task);
    } catch (error) {
        res.status(400).send({ error: 400, errorMessage: error });
    }
});

router.get('/tasks', auth, async (req, res) => {
    const match = {};
    const sort = {};
    if (req.query.completed) {
        match.completed = req.query.completed === 'true';
    }
    if (req.query.sortBy) {
        const parts = req.query.sortBy.split(':');
        sort[parts[0]] = (parts[1] === 'asc') ? 1 : -1;
    }
    try {
        await req.user.populate({
            path: 'tasks',
            match,
            options: {
                limit: parseInt(req.query.limit),
                skip: parseInt(req.query.skip),
                sort
            }
        });
        res.status(200).send(req.user.tasks);
    } catch (error) {
        console.log(error);
        res.status(500).send({ error: 500, errorMessage: 'An error ocurred trying to recovery the taks' });
    }
});

router.get('/tasks/:id', auth, async (req, res) => {
    try {
        const task = await Task.findOne({ id: req.params.id, owner: req.user._id });
        if (task) {
            res.status(200).send(task);
        } else {
            res.status(404).send({ error: 404, message: 'Task not found.' });
        }
    } catch (error) {
        res.status(500).send({ error: 500, errorMessage: error });
    }
});

router.patch('/tasks/:id', auth, async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['description', 'completed'];
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));
    if (isValidOperation) {
        try {
            const task = await Task.findOne({ _id: req.params.id, owner: req.user._id });
            if (task) {
                updates.forEach((update) => {
                    task[update] = req.body[update];
                });
                await task.save();
                res.status(200).send(task);
            } else {
                res.status(404).send({ error: 404, errorMessage: 'Task does not exist.' });
            }
        } catch (error) {
            res.status(500).send({ error: 500, errorMessage: error });
        }
    } else {
        res.status(400).send({ error: 400, errorMessage: 'Invalid updates.' });
    }
});

router.delete('/tasks/:id', auth, async (req, res) => {
    try {
        const task = await Task.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
        if (task) {
            res.status(200).send(task);
        } else {
            res.send(404).send({ error: 404, errorMessage: 'Task does not exist.' });
        }
    } catch (error) {
        res.status(500).send({ error: 500, errorMessage: error });
    }
});

module.exports = router;