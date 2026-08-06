const UI = {

    renderLayout() {

        document.getElementById("app").innerHTML = `

            <header class="topbar">
                <h1>SNP Planner V5</h1>
            </header>

            <main id="mainContent">

                <aside id="sidebar"></aside>

                <section id="workspace">

                    <h2>Welcome to SNP Planner V5</h2>

                    <p>System initialized successfully.</p>

                </section>

            </main>

        `;

    }

};
