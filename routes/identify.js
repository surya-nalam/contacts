const express = require("express");
const router = express.Router();
const { pool } = require("../db");

router.post("/identify", async (req, res) => {
  const { email, phoneNumber } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    
    const { rows: matchedContacts } = await client.query(
      `SELECT * FROM contact 
       WHERE email = $1 OR phoneNumber = $2
       ORDER BY createdAt ASC`,
      [email, phoneNumber]
    );

    let primaryContact;
    let allContacts = [];

    if (matchedContacts.length === 0) {
      
      const { rows: newRows } = await client.query(
        `INSERT INTO contact (email, phoneNumber, linkPrecedence, createdAt, updatedAt)
         VALUES ($1, $2, 'primary', NOW(), NOW())
         RETURNING *`,
        [email, phoneNumber]
      );

      const newContact = newRows[0];
      await client.query("COMMIT");

      return res.status(200).json({
        contact: {
          primaryContatctId: newContact.id,
          emails: [newContact.email].filter(Boolean),
          phoneNumbers: [newContact.phonenumber].filter(Boolean),
          secondaryContactIds: []
        }
      });
    }

    primaryContact = matchedContacts[0];

    
    for (const c of matchedContacts) {
      if (c.linkprecedence === "primary" && c.id !== primaryContact.id) {
        await client.query(
          `UPDATE contact
           SET linkPrecedence = 'secondary', linkedId = $1, updatedAt = NOW()
           WHERE id = $2`,
          [primaryContact.id, c.id]
        );
      }
    }

    const existingEmails = matchedContacts.map(c => c.email);
    const existingPhones = matchedContacts.map(c => c.phonenumber);
    const isNewEmail = email && !existingEmails.includes(email);
    const isNewPhone = phoneNumber && !existingPhones.includes(phoneNumber);

    if (isNewEmail || isNewPhone) {
      await client.query(
        `INSERT INTO contact (email, phoneNumber, linkPrecedence, linkedId, createdAt, updatedAt)
         VALUES ($1, $2, 'secondary', $3, NOW(), NOW())`,
        [email, phoneNumber, primaryContact.id]
      );
    }

    
    const { rows: allContactsResult } = await client.query(
      `SELECT * FROM contact
       WHERE id = $1 OR linkedId = $1 OR linkedId IN (
         SELECT id FROM contact WHERE linkedId = $1
       )
       ORDER BY createdAt ASC`,
      [primaryContact.id]
    );

    allContacts = allContactsResult;

    const primary = allContacts.find(c => c.id === primaryContact.id);
    const emails = [...new Set([primary?.email, ...allContacts.map(c => c.email)])].filter(Boolean);
    const phones = [...new Set([primary?.phonenumber, ...allContacts.map(c => c.phonenumber)])].filter(Boolean);
    const secondaryIds = allContacts.filter(c => c.linkprecedence === "secondary").map(c => c.id);

    await client.query("COMMIT");

    return res.status(200).json({
      contact: {
        primaryContatctId: primary.id,
        emails,
        phoneNumbers: phones,
        secondaryContactIds: secondaryIds
      }
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

module.exports = router;

