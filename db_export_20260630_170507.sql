--
-- PostgreSQL database dump
--


-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: cover_letter_table; Type: TABLE DATA; Schema: public; Owner: -
--

TRUNCATE TABLE public.cover_letter_table CASCADE;

COPY public.cover_letter_table (cover_letter_id, email, title, content, created_at) FROM stdin;
1	bigboss@gmail.com	Cover letter for Recruiting Coordinator at Summit Healthcare Group	<p>Big Boss<br>[Candidate Phone Number - not provided] | [Candidate Email - not provided] | [Candidate LinkedIn - not provided]</p><p>[Date]</p><p>Hiring Team<br>Summit Healthcare Group<br>[Company Address - not provided]</p><p>Dear Hiring Team,</p><p>I am writing to express my enthusiastic interest in the Recruiting Coordinator position at Summit Healthcare Group. As a detail-oriented professional with strong communication and organizational skills, I am confident that my background aligns perfectly with the requirements of this role and your mission to ensure a positive hiring experience for candidates.</p><p>Having gained valuable experience within the healthcare sector at ABC Healthcare Services, I am keen to continue contributing my administrative and coordination abilities to a dynamic healthcare environment. The opportunity to support a recruiting team by coordinating interviews, effectively communicating with candidates, and contributing to a seamless hiring process deeply appeals to my desire to facilitate smooth and efficient operations. I am eager to apply my skills to enhance the candidate experience and contribute to Summit Healthcare Group's success.</p><p>My previous role as an Administrative Assistant at ABC Healthcare Services provided me with direct experience in many of the core competencies required for this position. I was responsible for scheduling appointments and meticulously managing executive calendars, which directly translates to the coordination of interviews. Furthermore, I maintained confidential employee and client records, demonstrating my proficiency in precise record keeping and discretion—a critical aspect when handling sensitive candidate information. I also regularly prepared reports, correspondence, and meeting agendas, honing my ability to produce clear and professional communications. These experiences, complemented by my skills in Microsoft Office, Google Workspace, and Scheduling &amp; Calendar Management, prepare me to seamlessly support your recruiting operations.</p><p>My prior experience as a Customer Service Associate at Target further developed my strong communication skills, which are essential for effectively interacting with candidates and ensuring a positive hiring experience. In this role, I professionally assisted customers with inquiries and resolved concerns, showcasing my ability to manage interactions with empathy and clarity. Additionally, I gained experience in employee onboarding by training new team members on company procedures, providing me with an understanding of the initial stages of the employee journey and reinforcing my commitment to facilitating a positive entry experience for new hires. My background also includes HR Administration, which will be valuable in understanding the broader context of the recruiting process.</p><p>My Bachelor of Science in Business Administration from Rutgers University has equipped me with a robust understanding of organizational principles and effective professional practices, further enhancing my capability to manage tasks efficiently and contribute strategically to the recruiting function.</p><p>I am genuinely excited about the prospect of bringing my dedication, organizational acumen, and communication strengths to Summit Healthcare Group as your Recruiting Coordinator. I am confident that my proven ability to coordinate complex schedules, manage confidential information, and communicate effectively would make me a valuable asset to your team. Thank you for considering my application. I look forward to the opportunity to discuss how my skills and experience can benefit Summit Healthcare Group.</p><p>Sincerely,<br>Big Boss</p>	2026-06-30 16:45:35.856018
2	ac67@gmail.com	Cover letter for Junior Software Engineer at NovaTech Solutions	<p>[Your Name]<br>[Your Address]<br>[Your Phone Number]<br>[Your Email]</p><p>[Date]</p><p>Hiring Manager<br>NovaTech Solutions<br>[Company Address - if known, otherwise omit or use city, state]</p><p>Dear Hiring Manager,</p><p>I am writing to express my enthusiastic interest in the Junior Software Engineer position at NovaTech Solutions, as advertised. As a recent Computer Science graduate from NJIT with a strong foundation in software development and a passion for building scalable applications, I am eager to apply my skills and contribute to your team.</p><p>My academic journey has provided me with a robust understanding of object-oriented programming, database management, and core software development principles. I possess hands-on experience developing academic and personal projects using a variety of languages and tools including Java, Python, C++, JavaScript, and SQL. These experiences have equipped me with the practical ability to develop and maintain software, aligning directly with the requirements of this role, particularly your focus on Java and JavaScript for web applications. I am proficient in modern development tools such as Git &amp; GitHub and Virtual Studio Code, further enhancing my readiness to contribute from day one.</p><p>Beyond my programming skills, I am dedicated to delivering high-quality software through collaborative efforts. I am passionate about learning new technologies and working effectively within development teams, which I believe makes me well-suited for collaborating with senior engineers during code reviews and contributing positively to team dynamics. My problem-solving abilities, listed as a key skill, were further honed during my tenure as an IT Support Assistant at NJIT. In this role, I efficiently troubleshot and resolved a range of technical problems, including software and hardware issues, network connectivity, and workstation malfunctions. This experience has instilled in me a meticulous approach to identifying and resolving technical challenges, a skill I am confident will be invaluable in debugging and resolving software defects.</p><p>I am particularly drawn to NovaTech Solutions' commitment to developing and maintaining web applications. This opportunity represents an ideal environment for me to grow as a software engineer, apply my theoretical knowledge to real-world challenges, and contribute to innovative projects. I am eager to learn from experienced professionals and contribute my energy and skills to your team’s success.</p><p>Thank you for considering my application. I am available for an interview at your earliest convenience and welcome the opportunity to discuss how my skills and enthusiasm can benefit NovaTech Solutions.</p><p>Sincerely,<br>Alex Carter</p>	2026-06-30 16:55:59.878775
\.


--
-- Data for Name: job_table; Type: TABLE DATA; Schema: public; Owner: -
--

TRUNCATE TABLE public.job_table CASCADE;

COPY public.job_table (unique_num, email, company, title, description, stages, is_deleted, created_at, recruiter_notes, reminder_text, reminder_date) FROM stdin;
1	jcdjcd@gmail.com	Twitter	Data Science Intern	Prompting AI	0	f	2026-06-29 17:19:17.362481	\N	\N	\N
2	bigboss@gmail.com	Green Valley Medical Center	Administrative Assistant	Schedule appointments, make phone calls, prepare reports	0	f	2026-06-30 05:49:16.29183	\N	\N	2026-06-30
17	ac67@gmail.com	Metro Healthcare Network	IT Support Engineer	Troubleshoot hardware and software issues, Configure Windows and Linux workstations, Support Active Directory accounts, Install software updates	4	f	2026-06-30 17:01:53.20337	\N	\N	\N
4	bigboss@gmail.com	Apex Manufacturing	Human Resources Coordinator	Coordinate onboaring, maintain employee records, assist with recruiting	4	f	2026-06-30 05:53:24.075414	\N	\N	2026-06-30
3	bigboss@gmail.com	UPS	Warehouse Associate	Pick and pack orders, load and unload trucks, operate pallet jacks	5	f	2026-06-30 05:51:16.507579	\N	\N	2026-06-30
5	bigboss@gmail.com	Evergreen Logistics	Human Resources Assistant	assist with employee onboarding and orientation, maintain personal records and HR databases	4	f	2026-06-30 16:01:19.078805	\N	\N	2026-06-30
7	bigboss@gmail.com	Horizon Manufacturing	Executive Assistant	Provide executive level administrative support to senior leadership in a fast-paced	0	f	2026-06-30 16:16:01.95324	\N	\N	2026-06-30
18	ac67@gmail.com	Insight Analytics	Data Analyst	Analyze large datasets using SQL, Create dashboards and reports, Identify business trends, Validate data quality	5	f	2026-06-30 17:02:54.128213	\N	\N	\N
9	bigboss@gmail.com	BlueSky Engineering	Office Manager	Oversee office administration while supporting the company's HR operations and employee experience	0	f	2026-06-30 16:24:11.52397	\N	\N	2026-06-30
19	ac67@gmail.com	Skyline Cloud Services	DevOps Engineer	Maintain CI/CD pipelines, Build Docker containers, Monitor application deployments, Automate infrastructure tasks	0	f	2026-06-30 17:03:31.377519	\N	\N	\N
11	bigboss@gmail.com	Keystone Hospitality Group	Director of Human Resources	Provide strategic leadership for all HR functions across multiple business locations	4	f	2026-06-30 16:29:58.992743	\N	\N	2026-06-30
6	bigboss@gmail.com	Summit Healthcare Group	Recruiting Coordinator	Supporting recruit team by coordinate interviews, communicating with candidates, ensure positive hiring experience	1	f	2026-06-30 16:07:24.854705	\N	Send Follow Up	2026-07-01
8	bigboss@gmail.com	Atlas Contstruction Group	Human Resources Generalist	HR generalist will manage employee relations, recruitment, onboarding, benefits administration	1	f	2026-06-30 16:21:21.183644	\N	Check back with company	2026-07-02
10	bigboss@gmail.com	Liberty Medical Systems	Senior Human Resources Manager	Lead HR operations across multiple departments while driving employee engagement and organizational development	1	f	2026-06-30 16:25:52.97484	\N	Send Follow Up to Company	2026-07-02
12	ac67@gmail.com	NovaTech Solutions	Junior Software Engineer	Develop and maintain web applications using Java and JavaScript, Collaborate with senior engineers during code reviews,Debug and resolve software defects	1	f	2026-06-30 16:53:44.175273	\N	Follow Up with Company	2026-07-02
13	ac67@gmail.com	BrightEdge Technologies	Software Developer I	Develop backend services using Java and Spring Boot, Build RESTful APIs, Write SQL queries and database procedures, Participate in code reviews, Troubleshoot production issues, Document software features	4	f	2026-06-30 16:55:19.253305	\N	\N	\N
14	ac67@gmail.com	PixelForge Software	Full Stack Developer	Build responsive user interfaces with React, Develop backend APIs using Node.js, Integrate PostgreSQL databases, Optimize application performance	0	f	2026-06-30 16:57:02.476744	\N	\N	\N
15	ac67@gmail.com	CloudAxis Systems	Backend Developer	Design REST APIs, Implement business logic in Python, Optimize SQL queries, Develop microservices	0	f	2026-06-30 16:58:22.309294	\N	\N	\N
16	ac67@gmail.com	Quantum Software Group	QA Automation Engineer	Create automated test scripts, Perform regression testing, Report and track software defects, Collaborate with developers	1	f	2026-06-30 16:59:37.581812	\N	Send Follow Up	2026-07-03
\.


--
-- Data for Name: interview_table; Type: TABLE DATA; Schema: public; Owner: -
--

TRUNCATE TABLE public.interview_table CASCADE;

COPY public.interview_table (interview_id, job_id, interview_type, scheduled_at, notes, created_at, round_type) FROM stdin;
1	2	Other	2026-06-16 17:00:00		2026-06-30 05:50:19.966957	First Round
2	3	Other	2026-06-03 15:00:00		2026-06-30 05:51:48.163199	First Round
3	3	Other	2026-06-08 12:00:00		2026-06-30 05:52:10.76258	Technical
4	4	Other	2026-07-03 10:00:00		2026-06-30 05:53:45.537716	First Round
5	5	Other	2026-06-11 16:00:00		2026-06-30 16:05:37.775783	First Round
6	6	Other	2026-06-14 01:00:00		2026-06-30 16:07:42.554756	First Round
7	6	Other	2026-06-16 13:00:00		2026-06-30 16:08:10.99781	Technical
8	7	Other	2026-06-12 10:00:00		2026-06-30 16:16:18.933687	First Round
9	8	Other	2026-06-07 13:00:00		2026-06-30 16:21:40.397354	First Round
10	8	Other	2026-06-09 13:00:00		2026-06-30 16:22:15.071149	Virtual
11	8	Other	2026-06-11 12:00:00		2026-06-30 16:23:01.960258	Technical
12	9	Other	2026-06-15 12:00:00		2026-06-30 16:24:32.659994	First Round
13	9	Other	2026-06-18 01:00:00		2026-06-30 16:24:57.5233	Technical
14	10	Other	2026-06-12 13:00:00		2026-06-30 16:26:13.327705	First Round
15	11	Other	2026-06-22 13:00:00		2026-06-30 16:30:21.382436	First Round
16	12	Other	2026-06-30 14:00:00		2026-06-30 16:54:26.865777	First Round
17	13	Other	2026-06-13 13:00:00		2026-06-30 16:56:23.93964	First Round
18	14	Other	2026-06-10 13:00:00		2026-06-30 16:57:14.616937	First Round
19	14	Other	2026-06-12 13:00:00		2026-06-30 16:57:27.3277	Virtual
20	14	Other	2026-06-15 13:00:00		2026-06-30 16:57:38.399628	Technical
21	15	Other	2026-06-15 16:00:00		2026-06-30 16:58:49.218916	First Round
22	16	Other	2026-06-17 13:00:00		2026-06-30 16:59:52.772487	First Round
24	16	Other	2026-06-18 14:00:00		2026-06-30 17:00:16.547506	Technical
25	17	Other	2026-06-19 12:00:00		2026-06-30 17:02:11.518908	First Round
26	19	Other	2026-06-18 13:00:00		2026-06-30 17:03:54.13681	First Round
\.


--
-- Data for Name: job_cover_letter; Type: TABLE DATA; Schema: public; Owner: -
--

TRUNCATE TABLE public.job_cover_letter CASCADE;

COPY public.job_cover_letter (job_id, cover_letter_id) FROM stdin;
6	1
12	2
\.


--
-- Data for Name: resume_table; Type: TABLE DATA; Schema: public; Owner: -
--

TRUNCATE TABLE public.resume_table CASCADE;

COPY public.resume_table (experience_id, email, other_links, linkedin, education, summary, title, content, created_at) FROM stdin;
1	bigboss@gmail.com	\N	\N	\N	\N	Resume for Recruiting Coordinator at Summit Healthcare Group	<p>Big Boss</p><p>Professional Summary<br>Big Boss, known as 'The biggest boss around', is seeking the Recruiting Coordinator position at Summit Healthcare Group. Dedicated to supporting the recruit team by coordinating interviews, communicating with candidates, and ensuring a positive hiring experience.</p><p><br></p><h2 data-section-id="sjix36" data-start="113" data-end="136" class="PDq2pG_selectionAnchorContainer">Professional Summary<span aria-hidden="true" class="PDq2pG_selectionAnchor"></span></h2><p data-start="138" data-end="515">Organized and detail-oriented professional with strong communication and administrative skills seeking a Human Resources Assistant position. Experienced in coordinating schedules, maintaining confidential records, and providing excellent customer service. Eager to contribute to employee onboarding, recruitment, and HR operations while supporting a positive workplace culture.</p><hr data-start="517" data-end="520"><h2 data-section-id="nq27tb" data-start="522" data-end="534">Education</h2><p data-start="536" data-end="642"><strong data-start="536" data-end="586">Bachelor of Science in Business Administration</strong><br data-start="586" data-end="589">\nRutgers University – Newark, NJ<br data-start="620" data-end="623">\nGraduated: May 2025</p><hr data-start="644" data-end="647"><h2 data-section-id="esxisa" data-start="649" data-end="667">Work Experience</h2><h3 data-section-id="fgepgu" data-start="669" data-end="697">Administrative Assistant</h3><p data-start="698" data-end="764"><strong data-start="698" data-end="725">ABC Healthcare Services</strong> | Newark, NJ<br data-start="738" data-end="741">\n<strong data-start="741" data-end="764">June 2024 – Present</strong></p><ul data-start="766" data-end="1043">\n<li data-section-id="12z65sq" data-start="766" data-end="822">\nScheduled appointments and managed executive calendars\n</li>\n<li data-section-id="1olpv70" data-start="823" data-end="876">\nMaintained confidential employee and client records\n</li>\n<li data-section-id="jk9t8b" data-start="877" data-end="932">\nPrepared reports, correspondence, and meeting agendas\n</li>\n<li data-section-id="17wbx7p" data-start="933" data-end="988">\nCoordinated office supply inventory and vendor orders\n</li>\n<li data-section-id="1p8nbi6" data-start="989" data-end="1043">\nAssisted with onboarding paperwork for new employees\n</li>\n</ul><h3 data-section-id="shi58r" data-start="1045" data-end="1075">Customer Service Associate</h3><p data-start="1076" data-end="1133"><strong data-start="1076" data-end="1086">Target</strong> | Jersey City, NJ<br data-start="1104" data-end="1107">\n<strong data-start="1107" data-end="1133">August 2022 – May 2024</strong></p><ul data-start="1135" data-end="1343">\n<li data-section-id="g1nob0" data-start="1135" data-end="1192">\nAssisted customers with purchases and product inquiries\n</li>\n<li data-section-id="eejp2h" data-start="1193" data-end="1236">\nResolved customer concerns professionally\n</li>\n<li data-section-id="1dc0u37" data-start="1237" data-end="1285">\nTrained new team members on company procedures\n</li>\n<li data-section-id="1biwu5r" data-start="1286" data-end="1343">\nMaintained accurate cash handling and inventory records\n</li>\n</ul><hr data-start="1345" data-end="1348"><h2 data-section-id="196891j" data-start="1350" data-end="1359">Skills</h2><ul data-start="1361" data-end="1671">\n<li data-section-id="t42sqf" data-start="1361" data-end="1405">\nMicrosoft Office (Word, Excel, PowerPoint)\n</li>\n<li data-section-id="1f2frk4" data-start="1406" data-end="1424">\nGoogle Workspace\n</li>\n<li data-section-id="14svyt8" data-start="1425" data-end="1444">\nHR Administration\n</li>\n<li data-section-id="1jpjepd" data-start="1445" data-end="1466">\nEmployee Onboarding\n</li>\n<li data-section-id="99rmz3" data-start="1467" data-end="1501">\nScheduling &amp; Calendar Management\n</li>\n<li data-section-id="1nshlby" data-start="1502" data-end="1518">\nRecord Keeping\n</li>\n<li data-section-id="1t8l8q9" data-start="1519" data-end="1537">\nCustomer Service\n</li>\n<li data-section-id="rtazjb" data-start="1538" data-end="1570">\nWritten &amp; Verbal Communication\n</li>\n<li data-section-id="18crwer" data-start="1571" data-end="1603">\nOrganization &amp; Time Management\n</li>\n<li data-section-id="4unjvw" data-start="1604" data-end="1616">\nData Entry\n</li>\n<li data-section-id="7rni1g" data-start="1617" data-end="1638">\nAttention to Detail\n</li>\n<li data-section-id="4c43ga" data-start="1639" data-end="1671">\nConfidential Document Handling\n</li>\n</ul><hr data-start="1673" data-end="1676"><h2 data-section-id="61lfla" data-start="1678" data-end="1695">Certifications</h2><ul data-start="1697" data-end="1775">\n<li data-section-id="1tob8hv" data-start="1697" data-end="1732">\nMicrosoft Office Specialist (MOS)\n</li>\n<li data-section-id="nk51v6" data-start="1733" data-end="1775">\nOSHA 10-Hour General Industry (Optional)\n</li>\n</ul><hr data-start="1777" data-end="1780"><h2 data-section-id="74ooem" data-start="1782" data-end="1795">Activities</h2><p data-start="1797" data-end="1829"><strong data-start="1797" data-end="1829">Business Student Association</strong></p><p>\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n</p><ul data-start="1830" data-end="1976">\n<li data-section-id="1fa5otq" data-start="1830" data-end="1895">\nAssisted in organizing networking events and employer workshops\n</li>\n<li data-section-id="1d0m3nr" data-start="1896" data-end="1976">\nCollaborated with student leaders to coordinate meetings and campus activities&nbsp;</li>\n</ul>	2026-06-30 16:37:22.648539
2	bigboss@gmail.com	\N	\N	\N	\N	Resume for Recruiting Coordinator at Summit Healthcare Group	<p>Big Boss</p><p>Professional Summary<br>Big Boss, known as 'The biggest boss around', is seeking the Recruiting Coordinator position at Summit Healthcare Group. Dedicated to supporting the recruit team by coordinating interviews, communicating with candidates, and ensuring a positive hiring experience.</p><p><br></p><h2 data-section-id="sjix36" data-start="113" data-end="136" class="PDq2pG_selectionAnchorContainer">Professional Summary<span aria-hidden="true" class="PDq2pG_selectionAnchor"></span></h2><p data-start="138" data-end="515">Organized and detail-oriented professional with strong communication and administrative skills seeking a Human Resources Assistant position. Experienced in coordinating schedules, maintaining confidential records, and providing excellent customer service. Eager to contribute to employee onboarding, recruitment, and HR operations while supporting a positive workplace culture.</p><hr data-start="517" data-end="520"><h2 data-section-id="nq27tb" data-start="522" data-end="534">Education</h2><p data-start="536" data-end="642"><strong data-start="536" data-end="586">Bachelor of Science in Business Administration</strong><br data-start="586" data-end="589">\nRutgers University – Newark, NJ<br data-start="620" data-end="623">\nGraduated: May 2025</p><hr data-start="644" data-end="647"><h2 data-section-id="esxisa" data-start="649" data-end="667">Work Experience</h2><h3 data-section-id="fgepgu" data-start="669" data-end="697">Administrative Assistant</h3><p data-start="698" data-end="764"><strong data-start="698" data-end="725">ABC Healthcare Services</strong> | Newark, NJ<br data-start="738" data-end="741">\n<strong data-start="741" data-end="764">June 2024 – Present</strong></p><ul data-start="766" data-end="1043">\n<li data-section-id="12z65sq" data-start="766" data-end="822">\nScheduled appointments and managed executive calendars\n</li>\n<li data-section-id="1olpv70" data-start="823" data-end="876">\nMaintained confidential employee and client records\n</li>\n<li data-section-id="jk9t8b" data-start="877" data-end="932">\nPrepared reports, correspondence, and meeting agendas\n</li>\n<li data-section-id="17wbx7p" data-start="933" data-end="988">\nCoordinated office supply inventory and vendor orders\n</li>\n<li data-section-id="1p8nbi6" data-start="989" data-end="1043">\nAssisted with onboarding paperwork for new employees\n</li>\n</ul><h3 data-section-id="shi58r" data-start="1045" data-end="1075">Customer Service Associate</h3><p data-start="1076" data-end="1133"><strong data-start="1076" data-end="1086">Target</strong> | Jersey City, NJ<br data-start="1104" data-end="1107">\n<strong data-start="1107" data-end="1133">August 2022 – May 2024</strong></p><ul data-start="1135" data-end="1343">\n<li data-section-id="g1nob0" data-start="1135" data-end="1192">\nAssisted customers with purchases and product inquiries\n</li>\n<li data-section-id="eejp2h" data-start="1193" data-end="1236">\nResolved customer concerns professionally\n</li>\n<li data-section-id="1dc0u37" data-start="1237" data-end="1285">\nTrained new team members on company procedures\n</li>\n<li data-section-id="1biwu5r" data-start="1286" data-end="1343">\nMaintained accurate cash handling and inventory records\n</li>\n</ul><hr data-start="1345" data-end="1348"><h2 data-section-id="196891j" data-start="1350" data-end="1359">Skills</h2><ul data-start="1361" data-end="1671">\n<li data-section-id="t42sqf" data-start="1361" data-end="1405">\nMicrosoft Office (Word, Excel, PowerPoint)\n</li>\n<li data-section-id="1f2frk4" data-start="1406" data-end="1424">\nGoogle Workspace\n</li>\n<li data-section-id="14svyt8" data-start="1425" data-end="1444">\nHR Administration\n</li>\n<li data-section-id="1jpjepd" data-start="1445" data-end="1466">\nEmployee Onboarding\n</li>\n<li data-section-id="99rmz3" data-start="1467" data-end="1501">\nScheduling &amp; Calendar Management\n</li>\n<li data-section-id="1nshlby" data-start="1502" data-end="1518">\nRecord Keeping\n</li>\n<li data-section-id="1t8l8q9" data-start="1519" data-end="1537">\nCustomer Service\n</li>\n<li data-section-id="rtazjb" data-start="1538" data-end="1570">\nWritten &amp; Verbal Communication\n</li>\n<li data-section-id="18crwer" data-start="1571" data-end="1603">\nOrganization &amp; Time Management\n</li>\n<li data-section-id="4unjvw" data-start="1604" data-end="1616">\nData Entry\n</li>\n<li data-section-id="7rni1g" data-start="1617" data-end="1638">\nAttention to Detail\n</li>\n<li data-section-id="4c43ga" data-start="1639" data-end="1671">\nConfidential Document Handling\n</li>\n</ul><hr data-start="1673" data-end="1676"><h2 data-section-id="61lfla" data-start="1678" data-end="1695">Certifications</h2><ul data-start="1697" data-end="1775">\n<li data-section-id="1tob8hv" data-start="1697" data-end="1732">\nMicrosoft Office Specialist (MOS)\n</li>\n<li data-section-id="nk51v6" data-start="1733" data-end="1775">\nOSHA 10-Hour General Industry (Optional)\n</li>\n</ul><hr data-start="1777" data-end="1780"><h2 data-section-id="74ooem" data-start="1782" data-end="1795">Activities</h2><p data-start="1797" data-end="1829"><strong data-start="1797" data-end="1829">Business Student Association</strong></p><p>\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n</p><ul data-start="1830" data-end="1976">\n<li data-section-id="1fa5otq" data-start="1830" data-end="1895">\nAssisted in organizing networking events and employer workshops\n</li>\n<li data-section-id="1d0m3nr" data-start="1896" data-end="1976">\nCollaborated with student leaders to coordinate meetings and campus activities&nbsp;</li>\n</ul>	2026-06-30 16:37:42.78202
3	bigboss@gmail.com	\N	\N	\N	\N	Resume for Recruiting Coordinator at Summit Healthcare Group	<p>a</p><ul data-start="1830" data-end="1976">\n</ul>	2026-06-30 16:43:40.366731
4	bigboss@gmail.com	\N	\N	\N	\N	Saved resume	<p>Professional Summary</p><p>Highly organized and detail-oriented professional with a strong foundation in administration and customer service, seeking a Human Resources Assistant position. Proven ability to manage complex schedules, maintain confidential records, and deliver exceptional customer support. Eager to leverage strong communication skills and a proactive approach to support employee onboarding, recruitment, and HR operations, fostering a positive and efficient workplace environment.</p><p>Education</p><p>Bachelor of Science in Business Administration<br>Rutgers University – Newark, NJ<br>Graduated: May 2025</p><p>Work Experience<br>Administrative Assistant</p><p>ABC Healthcare Services | Newark, NJ<br>June 2024 – Present</p><p>Managed complex calendars and scheduled appointments for executives, ensuring optimal time management and productivity.<br>Safeguarded and maintained confidential employee and client records, ensuring compliance and data integrity.<br>Drafted and prepared professional reports, correspondence, and detailed meeting agendas.<br>Streamlined office supply inventory management and processed vendor orders, optimizing resource allocation.<br>Supported new employee onboarding by accurately processing and organizing essential paperwork.<br>Customer Service Associate</p><p>Target | Jersey City, NJ<br>August 2022 – May 2024</p><p>Provided exceptional customer service, assisting with purchases and expertly resolving product inquiries.<br>Effectively de-escalated and resolved diverse customer concerns, ensuring positive outcomes and satisfaction.<br>Mentored and trained new team members on company policies, product knowledge, and operational procedures.<br>Managed accurate cash handling procedures and maintained precise inventory records, minimizing discrepancies.<br>Skills<br>HR Administration<br>Employee Onboarding<br>Confidential Record Keeping<br>Scheduling &amp; Calendar Management<br>Microsoft Office Suite (Word, Excel, PowerPoint)<br>Google Workspace<br>Customer Service<br>Written &amp; Verbal Communication<br>Organization &amp; Time Management<br>Data Entry<br>Attention to Detail<br>Certifications<br>Microsoft Office Specialist (MOS)<br>OSHA 10-Hour General Industry<br>Activities</p><p>Business Student Association</p><p>Orchestrated and supported networking events and employer workshops.<br>Collaborated with student leaders to plan and execute impactful meetings and campus activities.</p>	2026-06-30 16:44:24.303575
5	ac67@gmail.com	\N	\N	\N	\N	Resume for Junior Software Engineer at NovaTech Solutions	<p>Alex Carter</p><p>Professional Summary<br>Recent Computer Science graduate with a strong foundation in software development and object-oriented programming, experienced in developing projects utilizing Java and JavaScript. Eager to contribute to developing and maintaining web applications, collaborate effectively within development teams, and resolve software defects.</p><p>Technical Skills<br>Technical: Java, JavaScript, Python, C++, SQL, HTML/CSS, Git &amp; GitHub, Virtual Studio Code<br>Soft Skills: Problem Solving, Team Collaboration, Communication, Time Management</p><p>Professional Experience<br>IT Support Assistant — NJIT — Newark, NJ<br>Assisted students and faculty by resolving diverse software and hardware issues, improving system reliability.<br>Configured and deployed Windows applications and campus-specific software, ensuring operational readiness.<br>Troubleshot and resolved technical problems related to printers, network connectivity, and workstations, minimizing downtime.<br>Documented support tickets and solutions, contributing to a knowledge base for efficient technical problem resolution.<br>Maintained accurate inventory of computer equipment, supporting resource management.</p><p>Education<br>NJIT<br>Bachelor of Science in Computer Science<br>June 2023 – June 2026</p>	2026-06-30 16:55:43.12381
6	ac67@gmail.com	\N	\N	\N	\N	Resume for QA Automation Engineer at Quantum Software Group	<p>Alex Carter<br>Software Engineer</p><p>Professional Summary<br>Recent Computer Science graduate with a strong foundation in software development, object-oriented programming, and database management, proficient in Java, Python, C++, JavaScript, and SQL. Experienced in developing academic and personal projects and passionate about building high-quality, scalable applications. Adept at collaborating with development teams to deliver robust software solutions, eager to apply strong analytical and problem-solving skills in a QA automation engineering role.</p><p>Technical Skills<br>Programming Languages: Java, Python, C++, Javascript, SQL<br>Web Technologies: HTML/CSS<br>Tools &amp; Platforms: Git &amp; GitHub, Virtual Studio Code<br>Soft Skills: Problem Solving, Team Collaboration, Communication, Time Management</p><p>Professional Experience<br>IT Support Assistant — NJIT — Newark, NJ — 09-24<br>Provided technical support, resolving software and hardware issues for diverse users.<br>Configured and deployed various Windows applications and campus software.<br>Diagnosed and resolved complex technical issues related to workstations, network connectivity, and peripherals.<br>Documented technical support incidents and implemented efficient solutions, maintaining detailed records.<br>Managed inventory of computer equipment, ensuring operational readiness.</p><p>Education<br>Bachelor of Science in Computer Science — NJIT — 06-26 — 06-23</p>	2026-06-30 17:00:45.231717
\.


--
-- Data for Name: job_resume; Type: TABLE DATA; Schema: public; Owner: -
--

TRUNCATE TABLE public.job_resume CASCADE;

COPY public.job_resume (job_id, resume_id) FROM stdin;
6	1
6	2
6	3
6	4
12	5
16	6
\.


--
-- Data for Name: stage_history; Type: TABLE DATA; Schema: public; Owner: -
--

TRUNCATE TABLE public.stage_history CASCADE;

COPY public.stage_history (history_id, job_id, stage, changed_at) FROM stdin;
1	3	1	2026-06-30 05:52:22.438278
2	4	4	2026-06-30 05:53:48.632341
3	3	5	2026-06-30 15:36:20.397315
4	5	4	2026-06-30 16:05:40.488185
5	6	1	2026-06-30 16:08:16.453981
6	8	1	2026-06-30 16:23:04.640715
7	10	1	2026-06-30 16:26:18.050175
8	11	4	2026-06-30 16:30:29.373803
9	12	1	2026-06-30 16:54:29.539023
10	13	4	2026-06-30 16:56:27.536646
11	16	1	2026-06-30 17:00:18.214485
12	17	4	2026-06-30 17:02:13.881117
13	18	5	2026-06-30 17:02:59.491288
\.


--
-- Data for Name: user_account; Type: TABLE DATA; Schema: public; Owner: -
--

TRUNCATE TABLE public.user_account CASCADE;

COPY public.user_account (user_id, clerk_id, email, email_verified, password_hash, created_at) FROM stdin;
88e8d766-a6c2-48c9-bedc-269565928efc	local-1782425328168-xhzolwn168	jcdjcd@gmail.com	f	$2b$10$qYGOVOjai0YPJdf.I1rZlu79q/Ik.l5k1HLDZ13y3aXp5JxMEqw6W	2026-06-25 18:08:48.422863
7c7a1a1c-ec3e-465d-8bc5-1a7958a6f350	local-1782812558770-x68z14hak1f	bigboss@gmail.com	f	$2b$10$bDx0LCC93AG3CkylWdNk5.ZpTyA4E7LFCd081dEOd1EgkCVpdCKG6	2026-06-30 05:42:39.182072
a6db01e3-54f0-4cf6-8610-ee59e30a26d3	local-1782852480263-487r3rsp1gt	ac67@gmail.com	f	$2b$10$7jrURfd2A3C62DpJqCsw/.5eEu0swAmNdd6i7OD2DFixdLkK1h6Gu	2026-06-30 16:48:00.386219
\.


--
-- Data for Name: user_profile; Type: TABLE DATA; Schema: public; Owner: -
--

TRUNCATE TABLE public.user_profile CASCADE;

COPY public.user_profile (user_id, email, phone, first_name, last_name, summary, experience, skills, career_preferences, profile_picture_url, education, target_role, location_preference, work_mode_preference, salary_expectation) FROM stdin;
\N	jcdjcd@gmail.com	7326767676	James Ryan	De Vera	HIIIIII	[{"title": "Intern", "company": "Riot Games", "end_date": "08-26", "location": "Los Angeles", "is_current": false, "start_date": "06-26", "description": "Intern shadowing people who worked on game code"}]	[]	\N	\N	[{"degree": "Bachelor", "school": "NJIT", "end_date": "09-27", "start_date": "09-23", "field_of_study": "Computer Science"}]	\N	\N	\N	\N
\N	bigboss@gmail.com	1234567890	Big	Boss	The biggest boss around with skills in organizing and detail oriented professsional with strong communication	[{"title": "Administrative Assistant", "company": "ABC Healthcare Services", "end_date": "07-25", "location": "Newark, NJ", "is_current": false, "start_date": "06-24", "description": "Scheduled appointments and managed executive calendars\\nMaintained confidential employee and client records\\nPrepared reports, correspondence, and meeting agendas"}, {"title": "Customer Service Associate", "company": "Target", "end_date": "", "location": "Jersity City, NJ", "is_current": true, "start_date": "07-25", "description": "Assisted customers with purchases and product inquiries\\nResolved customer concerns professionally\\nTrained new team members on company procedures"}]	["Microsoft Office", "Google Workspace", "HR Administration", "Employee Onboarding", "Scheduling & Calendar Management", "Record Keeping"]	\N	\N	[{"degree": "Bachelor in Science in Business Administration", "school": "Rutgers University", "end_date": "05-25", "start_date": "05-21", "field_of_study": "Science in Business Administration"}]	\N	\N	\N	\N
\N	ac67@gmail.com	7324206769	Alex	Carter	Recent Computer Science graduate with a strong foundation in software development, object-oriented programming, and database management. Experienced developing academic and personal projects using Java, Python, C++, JavaScript, and SQL. Passionate about building scalable applications, learning new technologies, and collaborating with development teams to deliver high-quality software.	[{"title": "IT Support Assistant", "company": "NJIT", "end_date": "", "location": "Newark, NJ", "is_current": true, "start_date": "09-24", "description": "Assisted students and faculty with software and hardware issues\\nInstalled and configured Windows applications and campus software\\nTroubleshot printers, network connectivity, and workstation issues\\nDocumented support tickets and resolved technical problems efficiently\\nMaintained inventory of computer equipment"}]	["Java", "Python", "C++", "Javascript", "SQL", "HTML/CSS", "Git & GitHub", "Virtual Studio Code", "Problem Solving", "Team Collaboration", "Communication", "Time Management"]	\N	\N	[{"degree": "Bachelor of Science in Computer Science", "school": "NJIT", "end_date": "06-26", "start_date": "06-23", "field_of_study": "Computer Science"}]	Software Engineer	NJ, NY	hybrid	$70,000-80,000
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

TRUNCATE TABLE public.users CASCADE;

COPY public.users (id, name) FROM stdin;
\.


--
-- Name: cover_letter_table_cover_letter_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cover_letter_table_cover_letter_id_seq', 2, true);


--
-- Name: interview_table_interview_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.interview_table_interview_id_seq', 26, true);


--
-- Name: job_table_unique_num_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.job_table_unique_num_seq', 19, true);


--
-- Name: resume_table_experience_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.resume_table_experience_id_seq', 6, true);


--
-- Name: stage_history_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.stage_history_history_id_seq', 13, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 1, false);


--
-- PostgreSQL database dump complete
--


