const ldap = require('ldapjs');
const fs = require('fs');
//const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { timeStamp } = require('console');

const app = express();
app.use(express.urlencoded({extended:true}));
app.use(cors());
app.use(express.json());
const PORT = 3000;

app.use(express.static('public', {
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            res.setHeader('Content-Type', 'text/html');
        }
    }
}));

app.use(express.static('images', {
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            res.setHeader('Content-Type', 'text/html');
        }
    }
}));

app.use('/css', express.static(path.join(__dirname + '/css')));
app.use((req,res,next) => {
    if (req.url.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
    }
    next();
});

/*
app.use('/js', express.static(path.join(__dirname + '/frontend_js')));
app.use((req,res,next) => {
    if (req.url.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
        console.log(res.getHeaders());
    }
    next();
});
*/

app.get('/', (req,res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/admin_main', (req,res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin_main.html'));
});
app.get('/user_main', (req,res) => {
    res.sendFile(path.join(__dirname, 'public', 'user_main.html'));
});
app.get('/course_pass', (req,res) => {
    res.sendFile(path.join(__dirname, 'public', 'course_pass.html'));
});
app.get('/results', (req,res) => {
    res.sendFile(path.join(__dirname, 'public', 'results.html'));
});

app.post('/check-results', async (req, res) => {
    console.log('Результы прохождения курса', req.body.course, 'пользователем', req.body.user, ':\n', req.body.results)
    let testname = JSON.parse(fs.readFileSync(`./courses/${req.body.course}.json`, 'utf-8')).test_name;
    let passed_array = [];
    const comparison = JSON.parse(fs.readFileSync(`./tests/${testname}.json`, 'utf-8'));
    let count = -1;
    let correct = 0;
    Object.values(comparison.questions).forEach(question => {
        count++;
        switch (question.answer_type) {
            case 'choicemany':
                //console.log(Object.values(question.answers),'and',req.body.results[count].answers);
                if (JSON.stringify(Object.values(question.answers)) === JSON.stringify(req.body.results[count].answers)) {
                    correct++;
                } 
                break;
            case 'choiceone':
                //console.log(Object.values(question.answers),'and',req.body.results[count].answers);
                if (JSON.stringify(Object.values(question.answers) === JSON.stringify(req.body.results[count].answers))) {
                    correct++;
                }
                break;
            case 'choicetext':
                //console.log(typeof(Object.keys(question.answers)),'and',typeof(req.body.results[count].answers));
                if (JSON.stringify(Object.keys(question.answers)).includes(req.body.results[count].answers)) {
                    correct++;
                } 

        }
    });
    console.log(`Дано правильно ${correct} ответов из ${comparison.number_of_questions}`);
    const date_of_completion = new Date().toLocaleString('ru-Ru', {timeZone: 'Europe/Kaliningrad'});
    fs.writeFileSync(`./users/${req.body.user}/completed/${req.body.course}.json`, JSON.stringify({
       correct: correct,
       from: count + 1,
       timestamp: date_of_completion,
       timer: req.body.timer
    }), 'utf-8');
    
    fs.unlinkSync(`./users/${req.body.user}/assigned/${req.body.course}.json`);
    res.json({url: `/results?correct=${correct}&from=${count + 1}&timestamp=${date_of_completion}&timer=${req.body.timer}&username=${req.body.user}`});
});


app.post('/redirect_to_course', async (req, res) => {
    console.log(req.query);
    try {
        const user = req.query.user;
        const course = req.query.course;
        res.json({
            url:`/course_pass?user=${user}&course=${course}`
        });       

    } catch(error) {
        console.error('Ошибка при перенаправлении', error);
    }

});

app.get('/get-course', async (req,res) => {
    const user = req.query.username;
    const course = req.query.course_to_pass;

    //if (!fs.existsSync())
    const datafromFile = JSON.parse(fs.readFileSync(`./courses/${course}.json`, 'utf-8'));
    const filename = datafromFile.file_name;
    const testname = datafromFile.test_name;
    console.log(filename, testname);
    const data = JSON.parse(fs.readFileSync(`./tests/${testname}.json`, 'utf-8'));
    console.log(data);
    //res.sendFile(path.join(__dirname,'course_files',`${filename}`));
    res.json(data);
});

app.get('/search', (req,res) => {
    const searchstr = req.query.search;
    var data = [];
    if (searchstr == '') {
        res.send(JSON.stringify(data));
    }
    const directories = fs.readdirSync('./learning_materials');
    directories.forEach(directory => {
        const files = fs.readdirSync(`./learning_materials/${directory}`);
        files.forEach(file => {
            let read_from_file = fs.readFileSync(`./learning_materials/${directory}/${file}`, 'utf-8').replace(/<[^>]*>/g, '');
            console.log(read_from_file);
            if (read_from_file.includes(searchstr)) {
                data.push({
                    filename: file, directory, innerData: read_from_file.substring(read_from_file.indexOf(searchstr), read_from_file.indexOf(searchstr) + 100)
                });
            }
            if (file.includes(searchstr)) {
                data.push({
                    filename: file, directory, innerData: ''
                });
            }
        });
    });
    console.log('Поиск:', searchstr, data);
    res.send(JSON.stringify(data));
});

app.get('/get-statistics', async (req,res) => {
    let data = [];
    const users = fs.readdirSync('./users', { withFileTypes: true }).filter(directory => directory.isDirectory()).map(directory => directory.name);
    console.log('check', users);
    users.forEach(user => {
        let completed_list = fs.readdirSync(`./users/${user}/completed`);

        let completed_data = [];
        completed_list.forEach(item => {
            let data2 = JSON.parse(fs.readFileSync(`./users/${user}/completed/${item}`, 'utf-8'));
            data2['coursename'] = item;
            completed_data.push(data2)
        });
        data.push({
            user, 
            completed_data
        });
    });
    res.json(JSON.stringify(data));

});

app.post('/auth',(req,res) => {
const username = req.body.username;
const password = req.body.password;
console.log('Data from client', username, password);
authenticateAD(username, password).then((message)=> {if (message.success === true) {
    if (message.username === "MOrlov") {res.redirect(`/admin_main?username=${message.username}`);} else {
        const datafromFile = JSON.parse(fs.readFileSync('./users/user-info.json', 'utf-8'));
        let searchUser = false;
        datafromFile['users'].forEach(user => searchUser = (user.name === message.username));
        if (searchUser === false) {
            console.log('newuser');
            let data = {status: "user", name: message.username};
            datafromFile['users'].push(data);
            fs.writeFileSync('./users/user-info.json', JSON.stringify(datafromFile, null, 2), 'utf-8');
            try {
                fs.mkdirSync(`./users/${message.username}`);
                fs.mkdirSync(`./users/${message.username}/assigned`);
                fs.mkdirSync(`./users/${message.username}/completed`);
            } catch(error) {
                console.error('Ошибка при создании папки', error);
            }
        }
        res.redirect(`/user_main?username=${message.username}`);
    }
}
});
});

const uploadDir = './course_files';
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['.doc','.docx','.pdf','.txt','.html'];
    const extname = allowedTypes.includes(path.extname(file.originalname).toLowerCase());
    //const mimetype = allowedTypes.test(file.mimetype);

    if (extname) {
        return cb(null, true);
    } else {
        cb(new Error('Неправильный формат файла'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 20*1024*1024},
    fileFilter: fileFilter
});

app.post('/upload', upload.single('file'), (req,res) => {
    res.json({
        message: 'Файл загружен',
        filename: req.file.filename,
        size: req.file.size
    });

});

app.post('/assign', (req,res) => {
    const date = new Date();
    const newDate = new Date(date.getTime() + req.body.days_to_pass*24*60*60*1000).toLocaleString('ru-Ru', {timeZone: 'Europe/Kaliningrad'});
    const data = {
        course_to_pass: req.body.course_to_assign,
        expire_date: newDate
    };
    fs.writeFileSync(`./users/${req.body.user_to_assign}/assigned/${req.body.course_to_assign}.json`, JSON.stringify(data));
});

app.post('/test-data', (req,res) => {
    console.log(req.body);
    fs.writeFileSync(`./tests/${req.body.test_name}.json`, JSON.stringify(req.body));
});

app.post('/course-data', (req,res) => {
    console.log(req.body);
    fs.writeFileSync(`./courses/${req.body.course_name}.json`, JSON.stringify(req.body));
});

app.get('/delete_course', async (req,res) => {
    try {
        console.log(req.query.course_to_delete);
        const course_to_delete = req.query.course_to_delete;
        let absolutePath = path.join(__dirname, `courses`);
        console.log(`${absolutePath}\\${course_to_delete}.json`);
        fs.unlinkSync(`${absolutePath}\\${course_to_delete}.json`);
        absolutePath = path.join(__dirname, `users`);
        const users = fs.readdirSync(absolutePath);
        users.forEach(user => {
            fs.unlinkSync(`${absolutePath}\\${user}\\assigned\\${course_to_delete}.json`);
        });
        res.sendStatus(200);

    } catch(error) {
        console.error('Ошибка при удалении', error);
    }
});

app.get('/get-info-assigned_courses', async (req, res) => {
    try {
        const user = req.query.user;
        const absolutePath = path.join(__dirname, `users/${user}/assigned`);
        const files = fs.readdirSync(absolutePath).map(item => item.slice(0, -5));
        //console.log(files);
        res.send(files);

    } catch(error) {
        console.error('Ошибка при отправке', error);
    }

});

app.get('/get-info-completed_courses', async (req, res) => {
    try {
        let data = [];
        const user = req.query.user;
        const absolutePath = path.join(__dirname, `users/${user}/completed`);
        const files = fs.readdirSync(absolutePath);
        console.log(files);
        files.forEach(file => {
            let course = JSON.parse(fs.readFileSync(`./users/${user}/completed/${file}`, 'utf-8'));
            course.course_name = file.slice(0,-5);
            data.push(course);
        });
        res.send(data);

    } catch(error) {
        console.error('Ошибка при отправке', error);
    }

});

app.get('/get-info-learning_materials', async (req, res) => {
    if (req.query.object === 'directories') {
        try {        
            const absolutePath = path.join(__dirname, `learning_materials`);
            const files = fs.readdirSync(absolutePath);
            //console.log(files);
            res.send(files);

        } catch(error) {
            console.error('Ошибка при отправке', error);
        }
    }
    if (req.query.object === 'files') {
        try {        
            const absolutePath = path.join(__dirname, `learning_materials/${req.query.where}`);
            const files = fs.readdirSync(absolutePath);
            //console.log(files);
            res.send(files);

        } catch(error) {
            console.error('Ошибка при отправке', error);
        }
    }
    if (req.query.object === 'file') {
        try {        
            const file = path.join(__dirname, `learning_materials/${req.query.where}/${req.query.which}`);
            res.sendFile(file);

        } catch(error) {
            console.error('Ошибка при отправке', error);
        }
    }

});

app.get('/get-info-tests', async (req, res) => {
    try {
        const absolutePath = path.join(__dirname, 'tests');
        console.log(absolutePath);
        const files = fs.readdirSync(absolutePath).map(item => item.slice(0, -5));
        //console.log(files);
        res.send(files)

    } catch(error) {
        console.error('Ошибка при отправке', error);
    }

});

app.get('/get-info-courses', async (req, res) => {
    try {
        const absolutePath = path.join(__dirname, 'courses');
        const files = fs.readdirSync(absolutePath).map(item => item.slice(0, -5));
        let data = [];
        files.forEach(file => {
            let file_data = JSON.parse(fs.readFileSync(`./courses/${file}.json`, 'utf-8'));
            data.push(file_data);
        });
        //console.log(files);
        res.send(data);

    } catch(error) {
        console.error('Ошибка при отправке', error);
    }

});

app.listen(PORT, () => {
console.log(`Server started on PORT ${PORT}`);
});

const AD_CONFIG = {
url: 'ldap://morlov.ku',
baseDN: 'DC=morlov,DC=ku',
domain: 'morlov.ku'
};

app.options('/auth', (req,res) => {
res.header('Access-Control-Allow-Origin', '*');
res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
res.header('Access-Control-Allow-Headers', 'Content-Type');
res.sendStatus(200);
});

app.options('/admin_main', (req,res) => {
res.header('Access-Control-Allow-Origin', '*');
res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
res.header('Access-Control-Allow-Headers', 'Content-Type');
res.sendStatus(200);
});

app.options('/user_main', (req,res) => {
res.header('Access-Control-Allow-Origin', '*');
res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
res.header('Access-Control-Allow-Headers', 'Content-Type');
res.sendStatus(200);
});

app.options('/redirect_to_course', (req,res) => {
res.header('Access-Control-Allow-Origin', '*');
res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
res.header('Access-Control-Allow-Headers', 'Content-Type');
res.sendStatus(200);
});





function authenticateAD(username, password) {
    return new Promise((resolve, reject) => {
        resolve({ 
                    success: true, 
                    message: 'Аутентификация успешна',
                    username: username
                });
        /*
        if (!username || !password) {
            resolve({ success: false, error: 'Логин и пароль обязательны' });
        }
        
        const client = ldap.createClient({
            url: AD_CONFIG.url,
            reconnect: false,
            timeout: 5000
        });

        // Формируем DN пользователя
        const userDN = `${username}@${AD_CONFIG.domain}`;

        client.bind(userDN, password, (err) => {
            if (err) {
                console.error('Ошибка аутентификации:', err.message);
                client.unbind();
                
                // Анализ ошибки
                let errorMessage = 'Ошибка аутентификации';
                if (err.name === 'InvalidCredentialsError') {
                    errorMessage = 'Неверный логин или пароль';
                } else if (err.name === 'NoSuchObjectError') {
                    errorMessage = 'Пользователь не найден';
                } else if (err.code === 'ECONNREFUSED') {
                    errorMessage = 'Не удалось подключиться к серверу AD';
                }
                
                resolve({ success: false, error: errorMessage });
            } else {
                console.log('Успешная аутентификация для:', username);
                client.unbind();
                resolve({ 
                    success: true, 
                    message: 'Аутентификация успешна',
                    username: username
                });
            }
        
        });

        // Таймаут подключения
        setTimeout(() => {
            client.unbind();
            resolve({ success: false, error: 'Таймаут подключения' });
        }, 10000);
    */   
    });
    
}

/*
// HTTP сервер
const server = http.createServer(async (req, res) => {
    // Разрешаем CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.end();
        return;
    }
    
    if (req.method === 'POST' && req.url === '/auth') {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', async () => {
            try {
                const { username, password } = JSON.parse(body);
                
                console.log(`Попытка аутентификации для: ${username}`);
                
                const authResult = await authenticateAD(username, password);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(authResult));
                
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: false, 
                    error: 'Неверный формат данных' 
                }));
            }
        });
    } 
});
*/
