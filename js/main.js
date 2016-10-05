// Set up three.js global variables
var scene, camera, renderer, container, loadingManager,stats;
// Set up avatar global variables
var bbox;
// Transfer global variables
var i_share = 0, n_share = 1, i_delta = 0.0;

var particleSystem;
var particleCount;
var particles;
var sawClock;
var particleClock;
var sawDeltaTime;
var particleDeltaTime;
var particleElapsedTime;
var bounces;
var count;

var max_angle = 30;
var min_angle = 0;
var max_vel = 15;
var min_vel = 0;
var px = -1.4;
var py = 0;
var pz = -0.5;
var pc = 50;
var cpc = 5;
var gravity = 9.8;


var Properties = function() {
  this.gravity = gravity;
  this.particles = cpc;
  this.max_angle = max_angle;
  this.max_vel = max_vel;
};

window.onload = function() {
	var prop = new Properties();
	var gui = new dat.GUI();
	gui.add(prop, 'gravity', -10, 20).step(0.2).onFinishChange(function(value) {
		gravity = value;
	});
	gui.add(prop, 'particles', 1, pc).step(1).name("Particle Count").onFinishChange(function(value) {
		if (cpc>value) {
			for (var i = value; i < cpc; i++) {
				particles.vertices[i].x = px;
				particles.vertices[i].y = py;
				particles.vertices[i].z = pz;
				particles.vertices[i].velocity = new THREE.Vector3(Math.random()*2-1,0, Math.random()*2-1);
				particles.vertices[i].angle = Math.random()*(max_angle-min_angle+1)+min_angle;
				particles.vertices[i].v0 = Math.random()*(max_vel-min_vel+1)+min_vel;
				particles.vertices[i].bounces = 0;
				particles.vertices[i].clock = new THREE.Clock(); 
				particleSystem.geometry.verticesNeedUpdate = true;
			}		
		}
		cpc = value;
	});
	gui.add(prop, 'max_angle', 0, 90).step(1).name("Max Particle angle").onFinishChange(function(value) {
		max_angle = value;
	});
	gui.add(prop, 'max_vel', min_vel, 30).step(1).name("Max Particle vel").onFinishChange(function(value) {
		max_vel = value;
	});
};

init();
animate();

// Sets up the scene.
function init()
{
	// Create the scene and set the scene size.
	scene = new THREE.Scene();
	
	// keep a loading manager
	loadingManager = new THREE.LoadingManager();

	// Get container information
	container = document.createElement('div');
	document.body.appendChild( container ); 
		
	var WIDTH = window.innerWidth, HEIGHT = window.innerHeight; //in case rendering in body
	
	// Create a renderer and add it to the DOM.
	renderer = new THREE.WebGLRenderer({antialias:true});
	renderer.setSize(WIDTH, HEIGHT);
	// Set the background color of the scene.
	renderer.setClearColor(0x333333, 1);
	//document.body.appendChild(renderer.domElement); //in case rendering in body
	container.appendChild( renderer.domElement );

	// Create a camera, zoom it out from the model a bit, and add it to the scene.
	camera = new THREE.PerspectiveCamera(45.0, WIDTH / HEIGHT, 0.01, 100);
	camera.position.set(-2, 2, -5);
	//camera.lookAt(new THREE.Vector3(5,0,0));
	scene.add(camera);
	count = 0;
	bounces = 0;
	// Create an event listener that resizes the renderer with the browser window.
	window.addEventListener('resize',
		function ()
		{
			var WIDTH = window.innerWidth, HEIGHT = window.innerHeight;
			renderer.setSize(WIDTH, HEIGHT);
			camera.aspect = WIDTH / HEIGHT;
			camera.updateProjectionMatrix();
		}
	);
 
	// Create a light, set its position, and add it to the scene.
	var alight = new THREE.AmbientLight(0xFFFFFF);
	alight.position.set(-100.0, 200.0, 100.0);
	scene.add(alight);

	var directionalLight = new THREE.DirectionalLight( 0xFFFFFF,0.5);
	directionalLight.position.set( 0, 5, 0 );
	directionalLight.castShadow = true;
	scene.add(directionalLight);

	// Load in the mesh and add it to the scene.
	var sawBlade_texPath = 'assets/sawblade.jpg';
	var sawBlade_objPath = 'assets/sawblade.obj';
	OBJMesh(sawBlade_objPath, sawBlade_texPath, "sawblade");

	var ground_texPath = 'assets/ground_tile.jpg';
	var ground_objPath = 'assets/ground.obj';
	OBJMesh(ground_objPath, ground_texPath, "ground");

	var slab_texPath = 'assets/slab.jpg';
	var slab_objPath = 'assets/slab.obj';
	OBJMesh(slab_objPath, slab_texPath, "slab");
	
	 //Stanford Bunny
	var bunny_texPath = 'assets/rocky.jpg';
	var bunny_objPath = 'assets/stanford_bunny.obj';
	OBJMesh(bunny_objPath, bunny_texPath, "bunny");
	

	 //Sphere
	var sphere_texPath = 'assets/rocky.jpg';
	var sphere_objPath = 'assets/sphere.obj';
	OBJMesh(sphere_objPath, sphere_texPath, "sphere");
	/*

	 //Cube
	var cube_texPath = 'assets/rocky.jpg';
	var cube_objPath = 'assets/cube.obj';
	OBJMesh(cube_objPath, cube_texPath, "cube");
	
	
	 //Cone
	var cone_texPath = 'assets/rocky.jpg';
	var cone_objPath = 'assets/cone.obj';
	OBJMesh(cone_objPath, cone_texPath, "cone");*/
	

	// Add OrbitControls so that we can pan around with the mouse.
	controls = new THREE.OrbitControls(camera, renderer.domElement);

	controls.enableDamping = true;
	controls.dampingFactor = 0.4;
	controls.userPanSpeed = 0.01;
	controls.userZoomSpeed = 0.01;
	controls.userRotateSpeed = 0.01;
	controls.minPolarAngle = -Math.PI/2;
	controls.maxPolarAngle = Math.PI/2;
	controls.minDistance = 0.01;
	controls.maxDistance = 30;


	sawClock = new THREE.Clock();
	particleClock = new THREE.Clock();
	sawDeltaTime = sawClock.getDelta();
	particleDeltaTime = particleClock.getDelta();

	particleSystem = createParticleSystem();
	scene.add(particleSystem);
	//animateParticles();
	stats = new Stats();
	container.appendChild( stats.dom );
}

function createParticleSystem() {
	 
	// The number of particles in a particle system is not easily changed.
	particleCount = pc;
	 
	// Particles are just individual vertices in a geometry
	// Create the geometry that will hold all of the vertices
	particles = new THREE.Geometry();
 
	// Create the vertices and add them to the particles geometry
	for (var p = 0; p < particleCount; p++) {
	 
		// This will create all the vertices in a range of -200 to 200 in all directions
		var x = px; 
		var y = py; 
		var z = pz; 

		// Create the vertex
		var particle = new THREE.Vector3(x, y, z);

		particle.velocity = new THREE.Vector3(Math.random()*2-1,0, Math.random()*2-1);
		particle.angle = Math.random()*(max_angle-min_angle+1)+min_angle;
		particle.v0 = Math.random()*(max_vel-min_vel+1)+min_vel;
		particle.bounces = 0;
		particle.clock = new THREE.Clock();
		// Add the vertex to the geometry
		particles.vertices.push(particle);

	}
 
	// Create the material that will be used to render each vertex of the geometry
	var particleMaterial = new THREE.PointsMaterial(
			{
			 color: 0xffffcc,
			 size: 0.5,
			 map: THREE.ImageUtils.loadTexture("assets/spark.png"),
			 blending: THREE.AdditiveBlending,
			 transparent: true,
			});

	// Create the particle system
	particleSystem = new THREE.Points(particles, particleMaterial);

	return particleSystem;  
}

function animate()
{
	sawDeltaTime = sawClock.getDelta();
	particleDeltaTime = particleClock.getDelta();
	//particleElapsedTime =particleClock.getElapsedTime();
	particleElapsedTime =particleClock.getElapsedTime();
	//console.log("particleElapsedTime: "+particleElapsedTime+"; particleDeltaTime: "+particleDeltaTime);

	//console.log(scene.getObjectByName("sphere").getWorldQuaternion());
	renderer.render(scene, camera);
	controls.update();

	var verts = particleSystem.geometry.vertices;
	for(var i = 0; i < cpc; i++) {
		var vert = verts[i];
		
		var particle = particles.vertices[i];

		var u = particle.v0;
		var angle = particle.angle *Math.PI/180; 
		var cos_t = Math.cos(angle); 
		t = particle.clock.getElapsedTime();
		x = u*t*cos_t;
		y = x*Math.tan(angle) - ((gravity)*x*x/(u*u*cos_t*cos_t));
		//console.log("X: "+x+" Y: "+y+" Count: "+(count++));

		vert.x = vert.x + x * particle.velocity.x * particleDeltaTime;
		vert.y = vert.y + y * particleDeltaTime;
		vert.z = vert.z + x * particle.velocity.z * particleDeltaTime;
		//console.log("p"+i+" PX: "+vert.x+" PY: "+vert.y);
		
		//particle.velocity = new THREE.Vector3(Math.random()*2-1,Math.random(), Math.random()*2-1); 
		if(insideSphere(vert.x,vert.y,vert.z)){
			console.log(i+" is insideSphere");
			particle.bounces++;
			particle.v0 = u*1.5;
			vert.y = vert.y * (-1);
			//particle.velocity.x*=-1;
			//particle.velocity.z*=-1;
			//particle.velocity = new THREE.Vector3(Math.random()*2-1,0, Math.random()*2-1);
			particle.velocity = new THREE.Vector3(-particle.velocity.x,0, particle.velocity.x);
			particle.clock = new THREE.Clock();
			particleSystem.geometry.verticesNeedUpdate = true;

			particles.vertices[i].x = vert.x;
			particles.vertices[i].y = vert.y;
			particles.vertices[i].z = vert.z;
			particles.vertices[i].velocity = new THREE.Vector3(-particle.velocity.x,0, particle.velocity.z);
			particles.vertices[i].angle = Math.random()*(max_angle-min_angle+1)+min_angle;
			particles.vertices[i].v0 = Math.random()*(max_vel-min_vel+1)+min_vel;
			particles.vertices[i].clock = new THREE.Clock(); 
			particleSystem.geometry.verticesNeedUpdate = true;
			
		}

		if (insideCube(vert.x,vert.y,vert.z)) {
			console.log(i+" is insidecube");

		}

		if (vert.y<0) {
			particle.bounces++;
			particle.v0 = u*0.5;
			vert.y = vert.y * (-0.5);
			particle.velocity.x=Math.random()*2-1;
			particle.velocity.z=Math.random()*2-1;
			particle.clock = new THREE.Clock();
			//console.log("p"+i+" particles: "+verts.length);
			if(particle.bounces>=3){
				/*if (i==cpc-1) {
					cpc=cpc;
				}*/
				particles.vertices[i].x = px;
				particles.vertices[i].y = py;
				particles.vertices[i].z = pz;
				particles.vertices[i].velocity = new THREE.Vector3(Math.random()*2-1,0, Math.random()*2-1);
				particles.vertices[i].angle = Math.random()*(max_angle-min_angle+1)+min_angle;
				particles.vertices[i].v0 = Math.random()*(max_vel-min_vel+1)+min_vel;
				particles.vertices[i].bounces = 0;
				particles.vertices[i].clock = new THREE.Clock(); 
				particleSystem.geometry.verticesNeedUpdate = true;
			}
			if (i<cpc-3 && particle.bounces==1) {
				if(Math.round(Math.random()*(11))>6){
					console.log("yay"+vert.y);

					/*particles.vertices[cpc+1].x = particles.vertices[i+1].x;
					particles.vertices[cpc+1].y = particles.vertices[i+1].y;
					particles.vertices[cpc+1].z = particles.vertices[i+1].z;
					particles.vertices[cpc+1].velocity = particles.vertices[i+1].velocity;
					particles.vertices[cpc+1].angle = particles.vertices[i+1].angle;
					particles.vertices[cpc+1].v0 = particles.vertices[i+1].v0;
					particles.vertices[cpc+1].bounces = particles.vertices[i+1].bounces;
					particles.vertices[cpc+1].clock = particles.vertices[i+1].clock;

						particles.vertices[cpc+2].x = particles.vertices[i+2].x;
						particles.vertices[cpc+2].y = particles.vertices[i+2].y;
						particles.vertices[cpc+2].z = particles.vertices[i+2].z;
						particles.vertices[cpc+2].velocity = particles.vertices[i+2].velocity;
						particles.vertices[cpc+2].angle = particles.vertices[i+2].angle;
						particles.vertices[cpc+2].v0 = particles.vertices[i+2].v0;
						particles.vertices[cpc+2].bounces = particles.vertices[i+2].bounces;
						particles.vertices[cpc+2].clock = particles.vertices[i+2].clock; */

						particles.vertices[i+1].x = vert.x;
						particles.vertices[i+1].y = vert.y;
						particles.vertices[i+1].z = vert.z;
						particles.vertices[i+1].velocity = new THREE.Vector3(Math.random()*2-1,0, Math.random()*2-1);
						particles.vertices[i+1].angle = Math.random()*(max_angle-min_angle+1)+min_angle;
						particles.vertices[i+1].v0 = Math.random()*(max_vel-min_vel+1)+min_vel;
						particles.vertices[i+1].bounces = 1;
						particles.vertices[i+1].clock = new THREE.Clock(); 

						particles.vertices[i+2].x = vert.x;
						particles.vertices[i+2].y = vert.y;
						particles.vertices[i+2].z = vert.z;
						particles.vertices[i+2].velocity = new THREE.Vector3(Math.random()*2-1,0, Math.random()*2-1);
						particles.vertices[i+2].angle = Math.random()*(max_angle-min_angle+1)+min_angle;
						particles.vertices[i+2].v0 = Math.random()*(max_vel-min_vel+1)+min_vel;
						particles.vertices[i+2].bounces = 1;
						particles.vertices[i+2].clock = new THREE.Clock(); 
						particleSystem.geometry.verticesNeedUpdate = true;
						
						console.log("parts: "+cpc);
					
				}
			}
			
			//console.log("p"+i+" X: "+vert.x+" Y: "+vert.y +" bounces:"+particle.bounces+" parts: "+verts.length);
		}

	}
	particleSystem.geometry.verticesNeedUpdate = true;
	requestAnimationFrame(animate);
	var sawbladeAsset = scene.getObjectByName( "sawblade" );

	translate(sawbladeAsset, 0,-1.5,0);
	rotate(sawbladeAsset, new THREE.Vector3(0,0,1), -9* sawDeltaTime); //rotate sawblade
	translate(sawbladeAsset, 0,1.5,0);

	stats.update();
	//postProcess();

}

function insideSphere(x,y,z) {
	// body...
	var ra = 1/Math.sqrt(2);
	value = 2*(x+2)*(x+2) + 2*(y-ra)*(y-ra) + 2*(z-1)*(z-1) - 0.5;
	
	if (value <=  0.1) {
		console.log("value:" +value);
		return true;
	}else
		return false;
}

function insideCube(x,y,z) {
	// body...
	value = 0;
	if (value >  0) {
		console.log("value:" +value);
		return true;
	}else
		return false;
}

function rotate(object, axis, radians)
{
	var rotObjectMatrix = new THREE.Matrix4();
	rotObjectMatrix.makeRotationAxis(axis.normalize(), radians);
	object.applyMatrix(rotObjectMatrix);
}

function translate(object, x, y, z)
{
	var transObjectMatrix = new THREE.Matrix4();
	transObjectMatrix.makeTranslation(x, y, z);
	object.applyMatrix(transObjectMatrix);
}

function postProcess()
{
	
	var delta = clock.getDelta();
	var sawbladeAsset = scene.getObjectByName( "sawblade" );

	translate(sawbladeAsset, 0,-1.5,0);
	rotate(sawbladeAsset, new THREE.Vector3(0,0,1), -9* delta); //rotate sawblade
	translate(sawbladeAsset, 0,1.5,0);
	
}


function OBJMesh(objpath, texpath, objName)
{
	var texture = new THREE.TextureLoader( loadingManager ).load(texpath, onLoad, onProgress, onError);
	var loader  = new THREE.OBJLoader( loadingManager ).load(objpath,  
		function ( object )
		{
			object.traverse(
				function ( child )
				{
					if(child instanceof THREE.Mesh)
					{
						child.material.map = texture;
						child.material.needsUpdate = true;
					}
	
				}
			);

			object.name = objName;

			/*
			if(objName=="sawblade")
				translate(object, 0,1.5,0); //move it up to slab*/

			if (objName=="sphere"){
				translate(object,1,0,1);
			}
				
			else if (objName=="cone")
				translate(object,1,0,-0.5);
			else if (objName=="cube")
				translate(object,0,0,-1);
			else if (objName=="slab")
				translate(object,0.5,-0.245,0);
			else if (objName=="bunny") {
				translate(object,1,0,-1);

			}

			scene.add( object );
			onLoad( object );
		},
	onProgress, onError);
}

function onLoad( object )
{
	putText(0, "", 0, 0);
	i_share ++;
	if(i_share >= n_share)
		i_share = 0;

}

function onProgress( xhr )
{ 
	if ( xhr.lengthComputable )
	{
		var percentComplete = 100 * ((xhr.loaded / xhr.total) + i_share) / n_share;
		putText(0, Math.round(percentComplete, 2) + '%', 10, 10);
	}
}

function onError( xhr )
{
	putText(0, "Error", 10, 10);
}

function putText( divid, textStr, x, y )
{
	//var text = document.getElementById("avatar_ftxt" + divid);
	var text = document.getElementById("info");
	text.innerHTML = textStr;
	text.style.left = x + 'px';
	text.style.top  = y + 'px';
}

function putTextExt(dividstr, textStr) //does not need init
{
	var text = document.getElementById(dividstr);
	text.innerHTML = textStr;
}