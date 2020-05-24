////////////////////////////////////////////////////////////////////////////////
// Module Controleur contient :
// - une fonction "init" pour initialiser l'application
// - une classe "controller" abstraite pour chaque page
////////////////////////////////////////////////////////////////////////////////

import * as modele from "./modele.js";

var partie = new modele.Partie();

////////////////////////////////////////////////////////////////////////////////
// init : exécuté au démarrage de l'application (voir fichier index.js)
////////////////////////////////////////////////////////////////////////////////

export function init() {
    // On duplique Header et Footer sur chaque page (sauf la première !)
    $('div[data-role="page"]').each(function (i) {
        if (i > 0)
            $(this).html($('#morpionHeader').html() + $(this).html() + $('#morpionFooter').html());
    });
    // On initialise les pages (attacher les "handlers" d'événements propres à chaque page)
    VueAccueilController.setEvents();
    VueJeuController.setEvents();
    VueFinController.setEvents();
    // On navigue vers la page d'accueil
    $.mobile.changePage("#vueAccueil");
}

////////////////////////////////////////////////////////////////////////////////
// Controleurs de pages : 1 contrôleur par page, qui porte le nom de la page
//  et contient les callbacks des événements associés à cette page
////////////////////////////////////////////////////////////////////////////////

export class VueAccueilController {

    static init() {
        $("#nomJoueur1").val("");
        $("#nomJoueur2").val("");
        $("#photoJoueur1").attr("src", "images/Photo_icon.png");
        $("#photoJoueur2").attr("src", "images/Photo_icon.png");
        $('#fileJoueur1').val("");
        $('#fileJoueur2').val("");

        partie = new modele.Partie();
        Object.setPrototypeOf(partie, modele.Partie.prototype);
    }

    static setEvents() {
        $(document).on("pagebeforeshow", "#vueAccueil", function () {this.init();}.bind(this));
        $("#btnNouvellePartie").on("click", function(){this.nouvellePartie();}.bind(this));
        $('#btnClearStorage').on("click", function(){this.clearSaves();}.bind(this));

        $("#photoJoueur1").on("click", function(){CameraController.takePicture(1);}.bind(this));
        $("#photoJoueur2").on("click", function(){CameraController.takePicture(2);}.bind(this));


        $("#fileJoueur1").on("change", function () {ImageController.takeUserImage(1, $("#fileJoueur1"));}.bind(this));
        $("#fileJoueur2").on("change", function () {ImageController.takeUserImage(2, $("#fileJoueur2"));}.bind(this));
    }

    static clearSaves() {
        modele.Utils.clearLocalStorage();
        plugins.toast.showShortCenter("Sauvegardes supprimées");
    }

    static nouvellePartie() {
        // on récupère de l'information de la vue en cours

        let joueur1 = $("#nomJoueur1").val();
        let joueur2 = $("#nomJoueur2").val();

        if (joueur1 === "" || joueur2 === "") {
            alert("Entrez un nom de joueur svp");
        } else {

            this.initJoueurs([joueur1, joueur2]);
            // Et on passe à une autre vue
            $.mobile.changePage("#vueJeu");
        }
    }

    static initJoueurs(nomsJoueurs){

        for (let numJoueur = 1; numJoueur <= 2 ; numJoueur++) {
            let joueur = modele.ScoreDAO.getJoueur(nomsJoueurs[numJoueur-1]);
            partie.setJoueur(joueur, numJoueur);

            if(partie.getJoueur(numJoueur) === null){    //Si aucun joueur n'est engeristré avec ce nom

                if(partie.photos[numJoueur] === undefined){     //Si le jour n'a pas choisi d'image, on lui attrubie son image par défaut
                    partie.setPhoto(modele.Defaults.getDefaultImage(numJoueur), numJoueur);
                }

                let joueur = modele.ScoreDAO.createJoueur(nomsJoueurs[numJoueur-1], partie.photos[numJoueur]);   //Création du nouveau joueur

                partie.setJoueur(joueur, numJoueur);     //enregistrement du joueur dans la partie en cours
                modele.ScoreDAO.saveJoueur(joueur);   //Enregistrement du nouveau joueur en BDD
            }else if(partie.getPhoto(numJoueur) !== undefined){  //Si il existe un joueur et qu'une nouvelle image lui est attribué
                partie.getJoueur(numJoueur).photo = partie.getPhoto(numJoueur);   //Attribution de la nouvelle photo
                modele.ScoreDAO.saveJoueur(partie.getJoueur(numJoueur));    //Sauvegarde des modifications
            }
        }
    }
}

////////////////////////////////////////////////////////////////////////////////
export class VueJeuController {

    static init() {

        $('p[data-role="nomJoueur1"]').html(partie.getJoueur(1).nom);  //Mise à jour des noms
        $('p[data-role="nomJoueur2"]').html(partie.getJoueur(2).nom);
        $('img[data-role="photoJoueur1"]').attr("src", partie.getJoueur(1).photo.base64);   //Mise à jour des images
        $('img[data-role="photoJoueur2"]').attr("src", partie.getJoueur(2).photo.base64);

        console.log(partie);
        let message = "Au tour de <b>" + partie.getJoueur(partie.joueurCourant).nom + "</b>";
        $('#currentPlayerMessage').html(message);
        this.genererGrille();
        debugger;
        // ET LA YA TOUT QUI BUG POURQUOIIIIIIIIII ????????
    }

    static setEvents() {
        $(document).on("pagebeforeshow", "#vueJeu", function () {this.init();}.bind(this));
    }


    static nouevllePartie() {
        this.init();
    }

    static finPartie() {
        $.mobile.changePage("#vueFin");
    }

    static genererGrille() {
        $('#gameGrid').html("");
        let firstDivClasses = ["ui-block-a", "ui-block-b", "ui-block-c"];

        for (let i = 0; i <= 8 ; i++) {

            let img = $('<img>', {
                class: 'ui-bar ui-bar-a grid-image',
                src: '',
                alt: 'case' + i.toString()
            });

            let outerDiv = $('<div></div>', {
                class: firstDivClasses[i % 3],
            });

            outerDiv.attr("id", "caseGrille"+i.toString());
            outerDiv.on("click", function () {
                VueJeuController.coup(i);
            })
            outerDiv.html(img);

            $('#gameGrid').append(outerDiv);
        }
    }

    static coup(numCase) {

        //Désactivation de la case
        let idCase = "#caseGrille" + numCase.toString();
        $(idCase).off('click');
        $(idCase).on("click", function () {
            plugins.toast.showShortBottom("Cette case est déjà occupée");
        });

        //Place l'image du joueur dans la case
        let imgJoueurCourant = partie.getJoueur(partie.joueurCourant).photo;
        $(idCase).children('img').attr("src", imgJoueurCourant.base64);

        //Mise à jour de la variable grille
        let ligne = Math.trunc(numCase/3);
        let colonne = numCase % 3;
        partie.grille[ligne][colonne];

        if(partie.verifierVictoire()){

        }else{  //Ne pas changer de joueur en cas de victoire pour conserver le vainqueur
            partie.switchJoueurCourant();

            //Mise à jour du message
            $('#currentPlayerMessage').children('b').html(partie.getJoueur(partie.joueurCourant).nom);
        }
    }

}

////////////////////////////////////////////////////////////////////////////////
export class VueFinController {
    static init() {
        $("#nbVictoires").html(session.partieEnCours.nbVictoires);
        $("#nbNuls").html(session.partieEnCours.nbNuls);
        $("#nbDefaites").html(session.partieEnCours.nbDefaites);
    }

    static setEvents() {
        $(document).on("pagebeforeshow", "#vueFin", function () {this.init();}.bind(this));
        $("#btnRetourJeu").on("click", function(){this.retourJeu();}.bind(this));
        $("#btnRetourAccueil").on("click", function(){this.retourAccueil();}.bind(this));
    }

    static retourJeu() {
        $.mobile.changePage("#vueJeu");
    }

    static retourAccueil() {
        $.mobile.changePage("#vueAccueil");
    }
}

export class CameraController {
    static takePicture(numJoueur) {

        modele.Picture.takePicture(
            function (uneImage) {
                ImageController.updatePicture(numJoueur, uneImage);
            },
            // erreurCB : on affiche la page erreur avec un message approprié
            function () {
                plugins.toast.showShortCenter("Impossible de prendre une photo");
            }
        );
    }
}

export class ImageController{

    static takeUserImage(numJoueur, data) {
        modele.Picture.createImageFromFile(data[0].files[0], function(uneImage) {
            ImageController.updatePicture(numJoueur, uneImage);
        });
    }

    static updatePicture(numJoueur, photo){

        let selector = "#photoJoueur"+numJoueur.toString();

        $(selector).attr("src", photo.base64);
        partie.photos[numJoueur] = photo;
    }
}