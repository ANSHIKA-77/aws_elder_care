// validators/auth.validator.js
const { body } = require('express-validator');

exports.registerRules = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/\d/).withMessage('Password must contain a number'),
    body('role')
        .isIn(['caretaker', 'client'])
        .withMessage('Role must be caretaker or client')
];

exports.loginRules = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password is required')
];