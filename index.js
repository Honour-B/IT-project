if (process.env.NODE_ENV !== "production") {
  require("dotenv").config()
}
const cloudinary = require('./public/cloudinary');
const fs = require('fs');
const express = require('express')
const { Client } = require('pg')
const client = require('./dbconnect.js');
const port = 5000
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
// const { path } = require('path');
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'bikaweihonour@gmail.com',
    pass: 'nnwcjvwwttmzerar', // Not your real Gmail password!
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("Transporter error:", error);
  } else {
    console.log("Email server is ready to send messages");
  }
});
const session = require('express-session');
const flash = require('express-flash');
const multer = require('multer');
const path = require('path');
const upload = multer({ dest: 'public/uploads',
  limits: { fileSize: 5 * 1024 * 1024 }, //  // 5 MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.jpg' && ext !== '.jpeg' && ext !== '.png') {
      return cb(new Error('Only .jpg, .jpeg, and .png files are allowed'));
    }
    cb(null, true);
  }
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads');
  },
  filename: function (req, file, cb) {
    if (!file || !file.originalname) {
      return cb(new Error('File not provided'));
    }
    const ext = path.extname(file.originalname);
    const filename = Date.now() + ext;
    cb(null, filename);
  }
});

const app = express();

app.post('/upload-image', upload.array('file'), async(req, res) => {

  const uploader = async (path) => await cloudinary.upload(path, 'images');

  if(req.method === 'POST') {
    const urls = [];
    const files = req.files;

    for(const file of files) {
      const { path } = file;
      const newPath = await uploader(path);
      urls.push(newPath);
      fs.unlinkSync(path); // Remove file from server after upload
    }
    console.log('url', urls);
    res.status(200).json({ message: 'Files uploaded successfully', data: urls });
  } else {
    res.status(405).json({ error: 'Method not allowed' });}
  // if (!req.file) {
  //   return res.status(400).json({ error: 'No file uploaded' });
  // }
// 
  //  res.json({
  //   location: '/uploads/' + req.file.filename
  //  const imageUrl = `/uploads/${req.file.filename}`;
  //  console.log(imageUrl);
  //  return res.json({ location: `/uploads/${req.file.filename}` });

  
});

app.use(session({
  secret: process.env.SECRET_KEY,    //SESSION_SECRET
  resave: false,
  saveUninitialized: false,
}))
console.log(session);
app.use(express.json())
app.set("view engine", "ejs")
app.use(express.static('views'));
app.use(express.urlencoded({ extended: true }));
app.use(flash());
app.use(express.static('public')); // Must be in your server setup
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
// Configure where uploaded files go

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).send('Something went wrong!');
});

app.get('/student-form', (req, res) => {
  res.render('student-form', {
    oldInput: {},     // define oldInput even if empty
    errors: {}
  })

});

//students
app.post('/student-form',
  [
    body('matric_num').matches(/^[a-zA-Z0-9\+]{5,15}$/).withMessage('Matric number is required'),
    body('full_name').matches(/^[a-zA-Z\s]{3,50}$/).withMessage('Full name is required'),
    body('level').isIn(['100', '200', '300', '400', '500', '600']).withMessage('Level must be one of 100, 200, 300, 400, 500, or 600'),
    body('department').matches(/^[a-zA-Z\s,]{3,50}$/).withMessage('Department is required'),
    body('faculty').matches(/^[a-zA-Z\s+]{3,50}$/).withMessage('Faculty is required'),
    body('school').matches(/^[a-zA-Z\s+]{3,50}$/).withMessage('School is required'),
    body('work_address').matches(/^[a-zA-Z0-9\s.,-]{5,100}$/).withMessage('Work address is required'),
    body('phone_num').matches(/^\+?[0-9]{10,12}$/).withMessage('Phone number must be 10 to 12 digits and may start with +'),
    body('email').isEmail().withMessage('A valid email is required'),
    body('it_duration').isIn(['1', '2', '3', '4', '5', '6']).withMessage('Select a valid IT duration'),
    body('start_date').isISO8601().withMessage('Start date must be a valid date')
  ], async (req, res) => {
    const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//   return res.status(400).render('student-form', {
//     errors: errors.mapped(),
//     oldInput: req.body,
//   });
// }

    const { matric_num, full_name, level, department, faculty, school, work_address, phone_num, email, it_duration, start_date} = req.body;
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(startDateObj);  
    endDateObj.setMonth(startDateObj.getMonth() + parseInt(it_duration));
    const insert_Query = 'INSERT INTO student (matric_num, full_name, level, department, faculty, school, work_address, phone_num, email, it_duration, start_date, end_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)'
    console.log(matric_num, full_name, level, department, faculty, school, work_address, phone_num, email, it_duration, startDateObj, endDateObj);
    
    try { 
      await client.query(insert_Query, [matric_num, full_name, level, department, faculty, school, work_address, phone_num, email, it_duration, startDateObj.toISOString(), endDateObj.toISOString()]);

  return res.redirect(`/request-otp?matric_num=${matric_num}&email=${email}`);

    } catch (err) {
      console.error('DB ERROR:', err.message);
       return res.status(500).send('Database error occurred: ' + err.message);
        }
})


app.get('/getData', (req, res) => {
  const get_query = "Select * from student"
  client.query(get_query, (err, result) => {
    if (err) {
      res.send(err)
    } else {
      console.log(result)
      res.send(result.rows)
    }
  })
})

app.get('/getbyMatric_Num/:matric_num', (req, res) => {
  const matric_num = req.params.matric_num
  const get_query = "Select * from student where matric_num = $1"
  client.query(get_query, [matric_num], (err, result) => {
    if (err) {
      res.send(err)
    } else {
      res.send(result.rows)
    }
  })
})

app.put('/update/:matric_num', (req, res) => {
  const matric_num = req.params.matric_num;
  const { full_name, level, department, faculty, school, work_address, phone_num, email } = req.body;
  const update_query = "UPDATE student SET full_name=$2, level=$3, department=$4, faculty=$5, school=$6, work_address=$7, phone_num=$8, email=$9 WHERE matric_num=$1"
  client.query(update_query, [matric_num, full_name, level, department, faculty, school, work_address, phone_num, email], (err, result) => {
    if (err) {
      res.send(err)
    } else {
      res.send("UPDATED")
    }
  })
})

app.delete('/delete/:matric_num', (req, res) => {
  const matric_num = req.params.matric_num;
  const delete_query = "Delete from student WHERE matric_num=$1"
  client.query(delete_query, [matric_num], (err, result) => {
    if (err) {
      res.send(err)
    } else {
      res.send(result)
    }
  })
})

//superviosrs routes
app.post('/postsupervisordData', (req, res) => {

  const {
    sup_full_name,
    email,
    phone_num,
    department,
    organisation
  } = req.body

  const insert_supQuery = 'INSERT INTO supervisors (sup_full_name, email, phone_num, department, organisation) VALUES ($1, $2, $3, $4, $5)'

  client.query(insert_supQuery, [sup_full_name, email, phone_num, department, organisation], (err, result) => {
    if (err) {
      res.send(err)
    } else {
      console.log(result),
        res.send("Posted Supervisors' Data")
    }
  })
})

app.get('/getSupData', (req, res) => {
  const get_Supquery = "Select * from supervisors"
  client.query(get_Supquery, (err, result) => {
    if (err) {
      res.send(err)
    } else {
      console.log(result)
      res.send(result.rows)
    }
  })
})

app.get('/getbySupervisors_id/:supervisors_id', (req, res) => {
  const supervisors_id = req.params.supervisors_id
  const get_Supquery = "Select * from supervisors where supervisors_id = $1"
  client.query(get_Supquery, [supervisors_id], (err, result) => {
    if (err) {
      res.send(err)
    } else {
      res.send(result.rows)
    }
  })
})

app.put('/updateSup/:supervisors_id', (req, res) => {
  const supervisors_id = req.params.supervisors_id;
  const { sup_full_name, email, phone_num, department, organisation } = req.body;
  const update_Supquery = "UPDATE supervisors SET sup_full_name=$1, email=$2, phone_num=$3, department=$4, organisation=$5 WHERE supervisors_id=$6"
  client.query(update_Supquery, [sup_full_name, email, phone_num, department, organisation, supervisors_id], (err, result) => {
    if (err) {
      res.send(err)
    } else {
      res.send("UPDATED")
    }
  })
})

app.delete('/deleteSup/:supervisors_id', (req, res) => {
  const supervisors_id = req.params.supervisors_id;
  const delete_Supquery = "Delete from supervisors WHERE supervisors_id=$1"
  client.query(delete_Supquery, [supervisors_id], (err, result) => {
    if (err) {
      res.send(err)
    } else {
      res.send(result)
    }
  })
})

// OTP routes
app.get('/request-otp', (req, res) => {
  const { matric_num, email } = req.query;

  res.render('request-otp', {
    matric_num,
    email,
    error: null,
    message: null
  })
});

app.post('/send-otp', async (req, res) => {
  const { matric_num, email } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otp_expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
  console.log("OTP:", otp);
  const insert_otp = 'INSERT INTO otp_otp(matric_num, email, otp, otp_expires) VALUES ($1, $2, $3, $4)';
  try {
    await client.query(insert_otp, [matric_num, email, otp, otp_expires]);

    // Send the email
    await transporter.sendMail({
      from: 'MAIL',
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP is ${otp}. It expires in 10 minutes.`
    });

    res.render('emailverification', { matric_num, email, error: null, message: "OTP sent to your email" });
  } catch (err) {
    console.error('Error sending OTP:', err);
    res.status(500).send("Failed to send OTP.")
  }
});

app.get('/verify-otp', (req, res) => {
  const { matric_num } = req.query;
  const email = req.query.email;
  res.render('emailverification', { matric_num, email, error: null });
});

// POST route to verify OTP
app.post('/verify-otp', async (req, res) => {
  try {
    const { matric_num, email } = req.body;
    let otp = req.body.otp;

    // Handle if otp comes as an array of digits (from multiple input fields)
    if (Array.isArray(otp)) {
      otp = otp.join('');
    }

    const result = await client.query('SELECT otp FROM otp_otp WHERE matric_num = $1', [matric_num]);
    const student = result.rows[0];

    if (!student) {
      return res.render('emailverification', { matric_num, email, error: 'No record found.' });
    }

    const dbOtp = String(student.otp).trim();
    const submittedOtp = String(otp).trim();
    console.log("DB OTP:", dbOtp, "| Submitted OTP:", submittedOtp);

    if (dbOtp !== submittedOtp) {
      return res.render('emailverification', { matric_num, email, error: 'Invalid OTP' });
    }

    await client.query(
      'UPDATE otp_otp SET is_verified = TRUE, otp = NULL, otp_expires = NULL WHERE matric_num = $1',
      [matric_num]
    );

    return res.redirect(`/setpassword?matric_num=${matric_num}`);
  } catch (err) {
    console.error('Error during OTP verification:', err);
    return res.status(500).send("Server error during OTP verification.");
  }
});

//PASSWORD FOR STUDENTS
app.post('/setpassword', async (req, res) => {
  const { matric_num, password, confirm_password } = req.body;

  if (password !== confirm_password) {
    return res.render('setpassword', { matric_num, error: "Passwords do not match" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = 'INSERT INTO "users" (user_id, password) VALUES ($1, $2)';
    await client.query(query, [matric_num, hashedPassword]);
    return res.redirect('/login'); // ✅ only one response
  } catch (err) {
    console.error(err);
    return res.status(500).send("An error occurred while setting the password.");
  }
});


app.get('/setpassword', (req, res) => {
  const matric_num = req.query.matric_num;
  res.render('setpassword', { matric_num, error: null });
});

//LOGIN
app.get('/login', (req, res) => {
  res.render('loginpage', { error: null });
});

app.post('/login', async (req, res) => {
  const { matric, password } = req.body;

  try {
    const result = await client.query('SELECT * FROM users WHERE user_id = $1', [matric]);
    const user = result.rows[0];

    if (!user) {
      return res.render('loginpage', { error: 'Invalid matric number or password' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.render('loginpage', { error: 'Invalid matric number or password' });
    }

    req.session.matric_num = matric;
    // Login success
    res.redirect('/submit-log');

  } catch (err) {
    console.error(err);
    // res.render('loginpage', { error: 'An error occurred. Try again later.' });

  }
});

//DASHBOARD
app.get('/submit-log', async (req, res) => {

  if (!req.session.matric_num) {
    return res.redirect('/login');
  }
  const today = new Date().toDateString();
  const matric_num = req.session.matric_num;
  //   res.render('log1', {matric_num: matric_num, today: today})
  console.log(matric_num, today);


  try {
    const result = await client.query(
      'SELECT * FROM student_log WHERE matric_num = $1 AND date = $2',
      [matric_num, today]
    );

    const alreadySubmitted = result.rows.length > 0;
    const submittedLog = result.rows[0];
    res.render('log2', {
      matric_num,
      today,
      alreadySubmitted,
      submittedLog: !!submittedLog,  // boolean for EJS conditional
       submittedLog: submittedLog || { images: [] },
      messages: req.flash()
    });
  } catch (err) {
    console.error(err);
    res.send('Error loading log page');
  }
});

app.post('/submit-log', async (req, res) => {
 if (!req.session.matric_num) {
    return res.redirect('/login');
  }

  const { log_text, imagefiles } = req.body;
  //  const images = JSON.parse(imagefiles || '[]');

  let images = [];
if (imagefiles) {
  try {
    images = JSON.parse(imagefiles);
  } catch (e) {
    // Assume it's a string URL, wrap it into an array:
    images = [imagefiles];
  }
}console.log('images', images)

  const today = new Date().toDateString();
  const matric_num = req.session.matric_num; // assuming student is logged in
  try {
    const existingLog = await client.query(
      'SELECT * FROM student_log WHERE matric_num = $1 and date = $2',
      [matric_num, today]
    );

    if (existingLog.rows.length > 0) {
      req.flash('error', 'You have already submitted your log for today.');
      return res.redirect('/submit-log');
    }

    await client.query(
      'INSERT INTO student_log (matric_num, log_text, date, images) VALUES ($1, $2, $3, $4)',
      [matric_num, log_text, today, images]
    );
    console.log(imagefiles)
    console.log('typeof imagefiles:', typeof imagefiles);
    console.log('imagefiles:', imagefiles);

    // alert("Log submitted successfully");
    res.redirect('/submit-log');
  } catch (err) {
    console.error('Error saving log:', err);
    res.status(500).send('Something went wrong.');
  }
});

  app.get('/calendar', async (req, res) => {
        const log_id = req.params.log_id;
        const matric_num = req.session.matric_num;
        console.log(log_id)
        // console.log(matric_num)
      if (!req.session.matric_num) return res.redirect('/login');

      let year = parseInt(req.query.year, 10);
    let month = parseInt(req.query.month, 10);

    if (!month || month < 1 || month > 12) {
       today = new Date();
      year = today.getFullYear();
       month = today.getMonth() + 1;
    }


      try { 
        const logsResult = await client.query(`
          SELECT date, log_text, log_id 
          FROM student_log 
          WHERE matric_num = $1 
            AND EXTRACT(YEAR FROM date) = $2 
            AND EXTRACT(MONTH FROM date) = $3
        `, [matric_num, year, month]);
        // console.log(matric_num, year, month)

        let logs = {};
        logsResult.rows.forEach(log => {
        // log.date is a JS Date if pg parses it, or a string if not
        let dateObj = log.date instanceof Date ? log.date : new Date(log.date);
        const key = dateObj.getFullYear() + '-' +
                    String(dateObj.getMonth() + 1).padStart(2, '0') + '-' +
                    String(dateObj.getDate()).padStart(2, '0');
        //   console.log(key)
        log.date = key; // Store the date in YYYY-MM-DD format
          logs[key] = log;

        });

    res.render('calendar', { logs, currentYear: year, currentMonth: month });
    } catch (err) {
        console.error('Error loading calendar:', err);
        res.status(500).send('Something went wrong.');
      }
});

app.get('/view-logs', async (req, res) => {
  if (!req.session.matric_num) {
    return res.redirect('/login');
  }

  const matric_num = req.session.matric_num;
  const page = parseInt(req.query.page) || 1; // page number, default to 1
  const limit = 10; // logs per page
  const offset = (page - 1) * limit;

  const totalCountResult = await client.query('SELECT COUNT(*) FROM student_log WHERE matric_num = $1', [matric_num]);
  const totalCount = parseInt(totalCountResult.rows[0].count);

  try {
    const result = await client.query('SELECT * FROM student_log WHERE matric_num = $1 order by date desc limit $2 offset $3', [matric_num, limit, offset]);
    const totalPages = Math.ceil(totalCount / limit);
    res.render('view-logs', { logs: result.rows, matric_num: matric_num, currentPage: page, totalPages, });
  } catch (err) {
    console.error('Error fetching logs:', err);
    res.status(500).send('Something went wrong.');
  }
});

//Edit all Logs
app.get('/edit-log/:log_id', async (req, res) => {
  const log_id = req.params.log_id;

  try {
    const result = await client.query('SELECT * FROM student_log WHERE log_id = $1', [log_id]);

    if (result.rows.length === 0) {
      return res.status(404).send('Log not found');
    }

    const log = result.rows[0];

    if (log.matric_num !== req.session.matric_num) {
      return res.status(403).send('Access denied');
    }

    //
    res.render('edit-log', { log });  // ✅ you're passing `log` here
  } catch (err) {
    console.error('Error fetching log:', err);
    res.status(500).send('Server error');
  }
});

app.post('/edit-log', async (req, res) => {
  const log_id = req.body.log_id;
  console.log(log_id)
  const log_text = req.body.log_text;
  console.log(log_text)
  const imagefiles = req.body.imagefiles || '[]'; // Ensure imagefiles is always a string
  const images = JSON.parse(imagefiles || '[]');

  try {
    await client.query('UPDATE student_log SET log_text = $1, images = $2 WHERE log_id = $3', [log_text, images, log_id]);
    console.log(log_id)
    res.redirect('/view-logs');

  } catch (err) {
    console.error('Error updating log:', err);
    res.status(500).send('Something went wrong.');
  }
});

// Edit recent log
app.get('/edit-new-log', async (req, res) => {
  if (!req.session.matric_num) {
    return res.redirect('/login');
  }

  const matric_num = req.session.matric_num;

  try {
    const result = await client.query('SELECT * FROM student_log WHERE matric_num = $1 ORDER BY log_id DESC LIMIT 1', [matric_num]);

    if (result.rows.length === 0) {
      return res.status(404).send('No logs found');
    }

    const log = result.rows[0];

    res.render('edit1_log', { log });
  } 
  catch (err) {
    console.error('Error fetching recent log:', err);
    res.status(500).send('Something went wrong.');
  }
});

app.post('/edit-new-log', async (req, res) => {
  const matric_num = req.session.matric_num;
  const updatedContent = req.body.log;
  const imagefiles = req.body.imagefiles || '[]'; // Ensure imagefiles is always a string
  const images = JSON.parse(imagefiles || '[]');

  if (!log_text || log_text.trim() === '') {
    return res.status(400).send('Log text cannot be empty');
  }

  try {
    await updateLogById(req.params.id, updatedContent); client.query('UPDATE student_log SET log_text = $1, images = $2  WHERE matric_num = $2', [log_text, images, matric_num]);
    res.redirect('/view-logs');
 
  } catch (err) {
    console.error('Error updating recent log:', err);
    res.status(500).send('Something went wrong.');
  }
});

//Profile 
app.get('/profile', async (req, res) => {
  if (!req.session.matric_num) {
    return res.redirect('/login');
  }

  const matric_num = req.session.matric_num;

  try {
    const result = await client.query('SELECT * FROM student WHERE matric_num = $1', [matric_num]);

    if (result.rows.length === 0) {
      return res.status(404).send('Profile not found');
    }

    const profile = result.rows[0];

    res.render('profile', { profile });
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).send('Something went wrong.');
  }
});

app.post('/calendar', async (req, res) => {
  const log_text = req.body.log_text;
  const { date } = req.body
  const today = new Date();
const logDate = new Date(date);
  // Clear time for accurate comparison
  logDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  // Week start (Sunday) and end (Saturday)
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());

  if (logDate < weekStart || logDate > today) {
    return res.status(403).send("You can only submit logs from the current week, up to today.");
  }

  if (!log_text || log_text.trim() === '') {
    return res.status(400).send('Log text cannot be empty');
  }
  
  console.log(date)
  // Try to get log_id from body or query (if editing an existing log)
  const log_id = req.body.log_id ?? req.query.log_id ?? null;
  const matric_num = req.session.matric_num;
  console.log(log_text, log_id, date, matric_num)
  // if (!log_text || !date || !matric_num) {
  // return res.status(400).send("Missing required fields");
  //   }

  try {
    if (log_id) {
      await client.query('UPDATE student_log SET log_text = $1 WHERE log_id = $2 and matric_num = $3', [log_text, log_id, matric_num]);
      console.log(log_text, log_id, matric_num)
    } else {
      await client.query(
        'INSERT INTO student_log (matric_num, log_text, date) VALUES ($1, $2, $3)',
        [matric_num, log_text, date]
      );
      console.log(matric_num, log_text, date)
    }
    res.redirect('calendar')
  } catch (err) {
    console.error('Error saving log:', err);
    res.status(500).send('Failed to save log');
  }
});

app.get('/supervisor-details', async (req, res) => {
  if (!req.session.matric_num) {
    return res.redirect('/login');
  }
  const matric_num = req.session.matric_num;
  const supervisor_id = req.body

  try {
    const result = await client.query('Select student.matric_num, student.supervisors_id, supervisors.supervisors_id, supervisors.sup_full_name, supervisors.department from student right join supervisors on student.supervisors_id = supervisors.supervisors_id where matric_num = $1', [matric_num])
    if (result.rows.length === 0) {
      return res.status(404).send('Profile not found');
    }
    const profile = result.rows[0]
    res.render('getsup', { profile });
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).send('Something went wrong.');
  }
});

app.get('/verifyotp', async(req, res) => {
  const matric_num = req.session.matric_num;
  const email = req.session.email;
  if (!matric_num ) {
    return res.redirect('/login');
  }
  try {
    const result = await client.query('SELECT email FROM student WHERE matric_num = $1', [matric_num]);
    const student = result.rows[0];

    if (!student) return res.status(404).send('Student not found');

    const email = student.email;
    req.session.email = email;

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otp_expires = new Date(Date.now() + 10 * 60 * 1000); // expires in 10 min

    await client.query(
      'INSERT INTO otp_otp(matric_num, email, otp, otp_expires) VALUES ($1, $2, $3, $4)',
      [matric_num, email, otp, otp_expires]
    );

    // Send email
    await transporter.sendMail({
      from: 'MAIL',
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP is ${otp}. It expires in 10 minutes.`,
    });
    } catch (err) {
    console.error(err);
    res.status(500).send('Error sending OTP or fetching student data');
  }
  res.render('verifyotp', { matric_num, email, message: null , error: null });
})

app.post('/verifyotp', async (req, res) => {
  const matric_num = req.session.matric_num;
  const email = req.session.email;
  const { otp } = req.body;

  try {
    const result = await client.query(
      'SELECT * FROM otp_otp WHERE matric_num = $1 AND email = $2 ORDER BY otp_expires DESC LIMIT 1',
      [matric_num, email]
    );

    if (
      result.rows.length === 0 ||
      result.rows[0].otp !== otp ||
      new Date(result.rows[0].otp_expires) < new Date()
    ) {
      return res.render('verifyotp', { error: 'Invalid or expired OTP' });
    }

    // OTP is valid, mark verified
    req.session.otpVerified = true;

    res.redirect('/change-password');
  } catch (err) {
    console.error(err);
    res.render('verifyotp', { message: null, error: 'Error verifying OTP' });
  }
});

app.get('/change-password', (req, res) => {
  if (!req.session.otpVerified) {
    return res.redirect('/verifyotp');
  }
  res.render('changepassword', { error: null, message: null });
});


app.post('/change-password', async (req, res) => {
  if (!req.session.otpVerified) {
    return res.redirect('/verifyotp');
  }

  const matric_num = req.session.matric_num;
  const { new_password, confirm_new_password } = req.body;
  const today = new Date().toDateString();
  const email = req.session.email;

  if (new_password !== confirm_new_password) {
    return res.render('changepassword', { error: 'Passwords do not match', message: null });
  }

  try {
    const hashedPassword = await bcrypt.hash(new_password, 10);
    await client.query('UPDATE users SET password = $1 WHERE user_id = $2', [hashedPassword, matric_num]);

    // Clear OTP verified flag after successful password change
    req.session.otpVerified = false;

    res.redirect('submit-log');
  } catch (err) {
    console.error(err);
    res.render('changepassword', { error: 'Error updating password', message: null });
  }
});

app.get('/monthly-report', async(req, res) => {
  const submitted = req.query.submitted === 'true';
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const currentMonthYear = `${year}-${month}`;

  const currentMonthYearFormatted = now.toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  const today = now.getDate();
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();

  const canSubmitWindow = today >= (lastDay - 6); // last week (7 days from end of month)
  let alreadySubmitted = false;

  const matric_num = req.session.matric_num
  if (matric_num) {
    const check = await client.query(
      'SELECT 1 FROM monthly_report WHERE matric_num = $1 AND month_year = $2',
      [matric_num, currentMonthYear]
    );
    alreadySubmitted = check.rowCount > 0;
  }

  const canSubmit = canSubmitWindow && !alreadySubmitted;

  res.render('report', {
    currentMonthYear,
    currentMonthYearFormatted,
    canSubmit,
    alreadySubmitted,
    submitted,
  });
});

app.post('/monthly-report', async(req, res) => {
   const { month_year, problems_encountered, solutions_provided } = req.body;
  const matric_num = req.session.matric_num;

  if (!matric_num) {
    return res.status(401).send("Unauthorized: Not logged in.");
  }

  try {
    // Check if report already exists for that month
    const existing = await client.query(
      'SELECT * FROM monthly_report WHERE matric_num = $1 AND month_year = $2',
      [matric_num, month_year]
    );
    
    if (existing.rows.length > 0) {
      return res.status(409).send("You have already submitted this month's report.");
    }
    //Insert new report
    await client.query(
      `INSERT INTO monthly_report (
        matric_num, month_year, problems_encountered, solutions_provided
      ) VALUES ($1, $2, $3, $4)`,
      [matric_num, month_year, problems_encountered.trim(), solutions_provided.trim()]
    );
    
    res.redirect('/monthly-report?submitted=true'); // or wherever you want to send them after submission
  } catch (err) {
    console.error("Error submitting monthly report:", err);
    res.status(500).send("Something went wrong. Please try again.");
  }
})

app.get('/forgot-password', (req, res) => {
  res.render('forgot-password', { error: null });
});

app.post('/forgot-password', async (req, res) => {
  const { matric_num } = req.body;

  try {
    const user = await client.query('SELECT * FROM users WHERE user_id = $1', [matric_num]);
    if (user.rows.length === 0) {
      return res.render('forgot-password', { error: 'Matric number not found in users table.' });
    }

    const student = await client.query('SELECT email FROM student WHERE matric_num = $1', [matric_num]);
    if (student.rows.length === 0) {
      return res.render('forgot-password', { error: 'Email not found for this matric number.' });
    }

    const email = student.rows[0].email;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    req.session.otp = otp;
    req.session.otp_email = email;
    req.session.otp_matric = matric_num;

    // Send OTP
   
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset OTP',
      html: `<p>Your OTP is: <b>${otp}</b></p>`,
    });

    res.redirect('/verify_otp');
  } catch (err) {
    console.error(err);
    res.render('forgot-password', { error: 'Error sending OTP. Please try again.' });
  }
});

app.get('/verify_otp', (req, res) => {
  res.render('otpverify', { error: null });
});

app.post('/verify_otp', (req, res) => {
  const { otp } = req.body;
  if (otp === req.session.otp) {
    res.render('set-password', { error: null, matric_num: req.session.otp_matric });
  } else {
    res.render('otpverify', { error: 'Invalid OTP' });
  }
});

app.post('/set-password', async (req, res) => {
  const { matric_num, password, confirm_password } = req.body;

  if (password !== confirm_password) {
    return res.render('set-password', {
      error: 'Passwords do not match',
      matric_num,
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password in users table
    await client.query('UPDATE users SET password = $1 WHERE user_id = $2', [
      hashedPassword,
      matric_num,
    ]);

    // Clear session OTP
    req.session.otp = null;
    req.session.otp_email = null;
    req.session.otp_matric = null;

    // Show message and redirect
    res.send(`
      <script>
        alert("✅ Password successfully reset!");
        window.location.href = "/login";
      </script>
    `);
  } catch (err) {
    console.error(err);
    res.render('set-password', {
      error: 'Error resetting password. Please try again.',
      matric_num,
    });
  }
});

//Logout
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).send('Could not log out.');
    }
    res.redirect('/login');
  });
});

app.listen(5000, () => {
  console.log("Good Job")

})