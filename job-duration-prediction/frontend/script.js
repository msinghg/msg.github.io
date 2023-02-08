const { ShellSdk, SHELL_EVENTS } = FSMShell;

const requireContextValue = {
    clientIdentifier: 'service-contract',
    auth: { response_type: 'token' },
};

if (ShellSdk.isInsideShell()) {
    const shellSdk = ShellSdk.init(parent, '*');
    shellSdk.emit(SHELL_EVENTS.Version1.REQUIRE_CONTEXT, requireContextValue);
    shellSdk.on(SHELL_EVENTS.Version1.REQUIRE_CONTEXT, (event) => {
        const {
          cloudHost,
          account,
          companyId,
          userId,
          auth
        } = JSON.parse(event);
        
        fetch('/auth/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + auth.access_token,
            'cloudHost': cloudHost,
            'account': account,
            'companyId': companyId,
            'userId': userId
          }
        })
        .then(response => response.json())
        .then(function(data) {
            if (data.token) {
              sessionStorage.setItem('token', data.token);
              window.location.href = '/me.html';
            } else {
              window.location.href = '/configure.html';
            }
        })
        .catch(function(exception) {
          alert(exception.message || 'An unknown error occured');
        });
      });
    }
        //initializeRefreshTokenStrategy(shellSdk, auth);
        updatePredictionUI('Select Activity');

        shellSdk.onViewState('activityID', async (activityID) => {
            sessionStorage.setItem('activityID', activityID);
            sessionStorage.setItem('event', event);

            updatePredictionUI();
            updateDurationUI();
            getActivityDto();
            getPrediction();
        });
    })
}
else {
    updatePredictionUI('Unable to reach shell eventAPI');
}

function initializeRefreshTokenStrategy(shellSdk, auth) {
    shellSdk.on(SHELL_EVENTS.Version1.REQUIRE_AUTHENTICATION, (event) => {
        sessionStorage.setItem('token', event.access_token);
        setTimeout(() => fetchToken(), (event.expires_in * 1000) - 5000);
    });

    function fetchToken() {
        shellSdk.emit(SHELL_EVENTS.Version1.REQUIRE_AUTHENTICATION, {
            response_type: 'token'
        });
    }

    sessionStorage.setItem('token', auth.access_token);
    setTimeout(() => fetchToken(), (auth.expires_in * 1000) - 5000);
}

function updatePredictionUI(text = '') {
    document.getElementById('predicted-duration').innerText = text;
}

function updatePredictionByTechnicianUI(text = '') {
    document.getElementById('technician-duration').innerText = text;
}

function updateDurationUI(text = '') {
    document.getElementById('actual-duration').innerText = text;
}

function getActivityDto() {
    const event = sessionStorage.getItem('event');
    const activityID = sessionStorage.getItem('activityID');

    const { cloudHost, account, company } = JSON.parse(event);

    const url = `https://${cloudHost}/api/data/v4/Activity/${activityID}?dtos=Activity.37&account=${account}&company=${company}`;

    const headers = {
        'Content-Type': 'application/json',
        'X-Client-ID': 'fsm-extension-sample',
        'X-Client-Version': '1.0.0',
        'Authorization': `bearer ${sessionStorage.getItem('data.token')}`,
    };

    // Fetch Activity object
    return fetch(url, { headers })
        .then(response => response.json())
        .then((json) => {
            const planned_duration = json.data[0].activity.plannedDurationInMinutes;
            updateDurationUI(`Planned Duration: ${planned_duration}`);
        })
}

function getPrediction() {
    updatePredictionUI(`Loading...`);
    const event = sessionStorage.getItem('event');

    const { cloudHost, account, accountId, company, companyId, user, userId, auth } = JSON.parse(event);
    const activityID = sessionStorage.getItem('activityID');
    console.log('Loading prediction for activityid...', activityID);

    if (activityID) {
        const headers = {
            'Authorization': `bearer ${sessionStorage.getItem('data.token')}`,
            'x-account-id': accountId,
            'x-account-name': account,
            'x-company-id': companyId,
            'x-company-name': company,
            'x-user-id': userId,
            'x-user-name': user,
            'x-client-version': 'a',
            'x-cloud-host': cloudHost,
            'activity-id': activityID,
            'x-request-id': '1',
        };

        const url = 'https://ingress.qt-1.coreinfra.io/job-duration-inference/portal/predict';


        fetch(url, { headers })
            .then(response => response.json())
            .then((res) => {
                updatePredictionUI(`Predicted Duration: ${res.prediction}`);
            })
            .catch((err) => {
                updatePredictionUI(err);
            })
    }
}

function getPredictionByTechnician(technician) {
    updatePredictionByTechnicianUI(`Loading...`);

    const event = sessionStorage.getItem('event');
    const { cloudHost, account, accountId, company, companyId, user, userId, auth } = JSON.parse(event);
    const activityID = sessionStorage.getItem('activityID');
    console.log('Loading prediction for activityid...', activityID);

    if (activityID) {
        const headers = {
            'Authorization': `bearer ${sessionStorage.getItem('data.token')}`,
            'x-account-id': accountId,
            'x-account-name': account,
            'x-company-id': companyId,
            'x-company-name': company,
            'x-user-id': userId,
            'x-user-name': user,
            'x-client-version': 'a',
            'x-cloud-host': cloudHost,
            'activity-id': activityID,
            'x-request-id': '1',
            
        };
        
        const url = `https://ingress.qt-1.coreinfra.io/job-duration-inference/portal/predict?resource_id=${technician.id}`;


        fetch(url, { headers })
            .then(response => response.json())
            .then(res => {
                
                updatePredictionByTechnicianUI(JSON.stringify(res, undefined, 2).replace(/[",{}]/g, ''));
            })
            .catch((err) => {
                updatePredictionByTechnicianUI(err);
            })
    }
}


   


// Setup technicians autocomplete
(() => {
    const input = document.getElementById('technician');

    let currentFocus;

    const fetchTechnicians = async (search) => {
        const headers = {
            'Authorization': `bearer ${sessionStorage.getItem('data.token')}`,
            'x-request-id': '1',
            'X-Client-ID': 'fsm-extension-sample',
            'X-Client-Version': '1.0.0',
            'Content-Type': 'application/json',
            
        };
        const event = sessionStorage.getItem('event');
        const { user, account, company } = JSON.parse(event);
        const body = {
            query: `
                SELECT  p.firstName, p.lastName, p.id, p.emailAddress
                FROM Person p
                WHERE  p.firstName ilike '%${search}%' or p.lastName ilike '%${search}%'
                ORDER BY p.firstName, p.lastName ASC
                LIMIT 20
            `
        };
        const queryParams = new URLSearchParams({
            user: user,
            account: account,
            company: company,
            dtos: 'Person.24',
        }).toString();
        const url = 'https://qt.dev.coresuite.com/api/data/query/v1?' + queryParams;

        return fetch(url, {method: 'POST', headers, body: JSON.stringify(body)})
            .then(response => response.json())
            .then(res => res?.data?.map(({p} = {}) => ({
                id: p.id,
                fullName: `${p.firstName} ${p.lastName}`,
                email: p.emailAddress,
            })))
            .catch((err) => console.error(err))
    }

    function addActive(x) {
        if (!x) return false;
        removeActive(x);
        if (currentFocus >= x.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = (x.length - 1);
        x[currentFocus].classList.add("autocomplete-active");
    }
    function removeActive(x) {
        for (let i = 0; i < x.length; i++) {
            x[i].classList.remove('autocomplete-active');
        }
    }
    function closeAllLists(element) {
        const x = document.getElementsByClassName('autocomplete-items');
        for (let i = 0; i < x.length; i++) {
            if (element != x[i] && element != input) {
                x[i].parentNode.removeChild(x[i]);
            }
        }
    }

    input.addEventListener('input', async function() {
        let options, option, searchValue = this.value.toLowerCase();

        if (searchValue.length < 2) return false;

        closeAllLists();
        if (!searchValue) return false;
        currentFocus = -1;

        options = document.createElement('div');
        options.setAttribute('id', this.id + 'autocomplete-list');
        options.setAttribute('class', 'autocomplete-items');
        options.innerHTML = 'Loading...';
        this.parentNode.appendChild(options);

        try {
            const results = await fetchTechnicians(this.value);
            options.innerHTML = '';

            if (!results.length) {
                options.innerHTML = 'No results found';
            }

            results.forEach((technician) => {
                option = document.createElement('div');
                option.innerHTML = technician.email;
                option.setAttribute('title', technician.email);

                option.addEventListener('click', () => {
                    input.value = technician.email;
                    closeAllLists();
                    getPredictionByTechnician(technician)
                });
                options.appendChild(option);
            })
        } catch (e) {
            console.error('Error while fetching technicians from QueryAPI')
        }
    });
    input.addEventListener('keydown', function(e) {
        let x = document.getElementById(this.id + 'autocomplete-list');
        if (x) x = x.getElementsByTagName("div");

        switch (e.key) {
            case 'ArrowDown': {
                currentFocus++;
                addActive(x);
                break;
            }
            case 'ArrowUp': {
                currentFocus--;
                addActive(x);
                break;
            }
            case 'Enter': {
                e.preventDefault();
                if (currentFocus > -1) {
                    if (x) x[currentFocus].click();
                }
                break;
            }
        }
    });

    document.addEventListener('click', (e) => closeAllLists(e.target));
})()