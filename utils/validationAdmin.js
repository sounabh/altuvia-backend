// ============= VALIDATION SCHEMAS =============
// Joi-based validation for different authentication-related actions
import Joi from 'joi'; // Import Joi for schema validation

// ========== Register Schema ==========
// Validates user registration input
export const registerSchema = Joi.object({
  email: Joi.string()
    .email()                           // Must be a valid email format
    .required(),                       // Email is required

  password: Joi.string()
    .min(8)                            // Minimum 8 characters
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/) // Must include uppercase, lowercase, number, and special character
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }),

  firstName: Joi.string()
    .min(2)                            // Minimum 2 characters
    .max(50)                           // Maximum 50 characters
    .required(),                       // Required field

  lastName: Joi.string()
    .min(2)
    .max(50)
    .required(),

  role: Joi.string()
    .valid('ADMIN', 'CONTENT_EDITOR', 'UNIVERSITY_MODERATOR') // Only these roles are allowed
    .optional()
});

// ========== Login Schema ==========
// Validates login credentials
export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required(),

  password: Joi.string()
    .required()                        // No complexity required here; just check presence
});

// ========== Change Password Schema ==========
// Validates change password request
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required(),                       // User must provide current password

  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/) // Enforces strong password
    .required()
    .messages({
      'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    })
});

// ========== 2FA Verification Schema ==========
// Validates token during 2FA setup
export const verify2FASchema = Joi.object({
  token: Joi.string()
    .length(6)                         // TOTP tokens are 6 digits
    .pattern(/^\d+$/)                  // Must be numeric
    .required()
});

// ========== 2FA Login Schema ==========
// Used after initial login to complete 2FA flow
export const verify2FALoginSchema = Joi.object({
  tempToken: Joi.string()
    .required(),                       // Temporary token passed after first auth step

  token: Joi.string()
    .length(6)
    .pattern(/^\d+$/)
    .required()
});

// ========== Promote User Schema ==========
// Validates user role promotion
export const promoteUserSchema = Joi.object({
  userId: Joi.string()
    .required(),                       // The ID of the user being promoted

  newRole: Joi.string()
    .valid('STUDENT', 'ADMIN', 'CONTENT_EDITOR', 'UNIVERSITY_MODERATOR', 'MAIN_ADMIN') // Only valid roles allowed
    .required()
});
