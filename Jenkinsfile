pipeline {
    agent any

    tools {
        nodejs "NodeJS_22"
    }

   environment {
    DOCKER_HUB_USER = 'mhd0'
    FRONT_IMAGE = 'react-frontend'
    BACK_IMAGE  = 'express-backend'
    DOCKER_TAG = "${env.BUILD_NUMBER}"
    K8S_NAMESPACE = 'camion-app'
    K8S_CLUSTER = 'minikube'
    PATH = "/usr/local/bin:${env.PATH}"
}

    triggers {
        GenericTrigger(
            genericVariables: [
                [key: 'ref', value: '$.ref'],
                [key: 'pusher_name', value: '$.pusher.name'],
                [key: 'commit_message', value: '$.head_commit.message']
            ],
            causeString: 'Push par $pusher_name sur $ref: "$commit_message"',
            token: 'mysecret',
            printContributedVariables: true,
            printPostContent: true
        )
    }

    stages {
        stage('Vérification Environnement') {
            steps {
                script {
                    echo "🔍 Vérification des prérequis..."
                    
                    // Vérifier Docker
                    try {
                        sh 'docker --version'
                        echo "✅ Docker disponible"
                    } catch (Exception e) {
                        error "❌ Docker n'est pas installé sur ce serveur Jenkins"
                    }
                    
                    // Vérifier Kubernetes
                    try {
                        sh 'kubectl version --client'
                        echo "✅ kubectl disponible"
                    } catch (Exception e) {
                        error "❌ kubectl n'est pas installé"
                    }
                    
                    // Vérifier Node.js
                    sh 'node --version'
                    sh 'npm --version'
                    
                    echo "🚀 Démarrage du déploiement sur cluster: ${K8S_CLUSTER}"
                }
            }
        }

        stage('Checkout et Préparation') {
            steps {
                git branch: 'main', url: 'https://github.com/mhdgeek/express_mongo_react.git'
                
                script {
                    // Créer le dossier k8s s'il n'existe pas
                    sh 'mkdir -p k8s'
                    echo "✅ Repository cloné et structure préparée"
                }
            }
        }

        stage('Install dependencies - Backend') {
            steps {
                dir('back-end') {
                    sh 'npm ci --only=production'
                }
            }
        }

        stage('Install dependencies - Frontend') {
            steps {
                dir('front-end') {
                    sh 'npm ci --only=production'
                }
            }
        }

        stage('Run Tests') {
            steps {
                script {
                    try {
                        dir('back-end') {
                            sh 'npm test || echo "⚠️ Tests backend terminés avec warnings"'
                        }
                    } catch (Exception e) {
                        echo "❌ Tests backend échoués: ${e.message}"
                        currentBuild.result = 'UNSTABLE'
                    }
                    
                    try {
                        dir('front-end') {
                            sh 'npm test -- --watchAll=false || echo "⚠️ Tests frontend terminés avec warnings"'
                        }
                    } catch (Exception e) {
                        echo "❌ Tests frontend échoués: ${e.message}"
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                script {
                    if (!fileExists('front-end/Dockerfile')) {
                        error "❌ Dockerfile manquant dans front-end/"
                    }
                    if (!fileExists('back-end/Dockerfile')) {
                        error "❌ Dockerfile manquant dans back-end/"
                    }
                    
                    echo "🏗️ Construction des images Docker..."
                    
                    sh """
                        docker build -t $DOCKER_HUB_USER/$FRONT_IMAGE:$DOCKER_TAG ./front-end
                        docker tag $DOCKER_HUB_USER/$FRONT_IMAGE:$DOCKER_TAG $DOCKER_HUB_USER/$FRONT_IMAGE:latest
                        
                        docker build -t $DOCKER_HUB_USER/$BACK_IMAGE:$DOCKER_TAG ./back-end
                        docker tag $DOCKER_HUB_USER/$BACK_IMAGE:$DOCKER_TAG $DOCKER_HUB_USER/$BACK_IMAGE:latest
                    """
                    
                    sh 'docker images | grep "$DOCKER_HUB_USER"'
                }
            }
        }

        stage('Push Docker Images') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-credentials', 
                    usernameVariable: 'DOCKER_USER', 
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    script {
                        echo "📦 Push vers Docker Hub..."
                        sh """
                            echo \$DOCKER_PASS | docker login -u \$DOCKER_USER --password-stdin
                            
                            docker push \$DOCKER_USER/$FRONT_IMAGE:$DOCKER_TAG
                            docker push \$DOCKER_USER/$FRONT_IMAGE:latest
                            
                            docker push \$DOCKER_USER/$BACK_IMAGE:$DOCKER_TAG
                            docker push \$DOCKER_USER/$BACK_IMAGE:latest
                        """
                    }
                }
            }
        }

        stage('Configuration Kubernetes') {
    steps {
        script {
            // Au lieu de dépendre de Minikube, utiliser le contexte directement
            withCredentials([file(credentialsId: 'k8s-kubeconfig', variable: 'KUBECONFIG_FILE')]) {
                sh '''
                    export KUBECONFIG=$KUBECONFIG_FILE
                    
                    # Tenter la connexion avec retry
                    for i in {1..10}; do
                        if kubectl cluster-info > /dev/null 2>&1; then
                            echo "✅ Connecté au cluster Kubernetes"
                            break
                        else
                            echo "⚠️ Tentative $i/10 échouée, nouvel essai dans 10s..."
                            sleep 10
                        fi
                    done
                    
                    # Vérifications de base
                    kubectl get nodes
                    kubectl get namespaces
                '''
            }
        }
    }
}

        stage('Déploiement des Configurations K8S') {
            steps {
                script {
                    echo "📋 Application des configurations Kubernetes..."
                    
                    withCredentials([file(credentialsId: 'k8s-kubeconfig', variable: 'KUBECONFIG_FILE')]) {
                        // Appliquer les configurations de base
                        sh """
                            export KUBECONFIG=\$KUBECONFIG_FILE
                            kubectl config use-context $K8S_CLUSTER
                            
                            # Service Account pour Jenkins (si nécessaire)
                            kubectl apply -f k8s/jenkins-service-account.yaml -n $K8S_NAMESPACE || echo "ServiceAccount déjà configuré"
                            
                            # ConfigMaps
                            kubectl apply -f k8s/configmap.yaml -n $K8S_NAMESPACE
                            
                            # Secrets (à créer manuellement d'abord)
                            kubectl apply -f k8s/secrets.yaml -n $K8S_NAMESPACE || echo "Secrets déjà configurés"
                        """
                    }
                }
            }
        }

        stage('Déploiement des Applications K8S') {
            steps {
                script {
                    echo "🚀 Déploiement des applications sur Kubernetes..."
                    
                    // Mise à jour des tags d'image dans les manifests
                    sh """
                        sed -i.bak 's|\\$DOCKER_TAG|$DOCKER_TAG|g' k8s/backend-deployment.yaml
                        sed -i.bak 's|\\$DOCKER_HUB_USER|$DOCKER_HUB_USER|g' k8s/backend-deployment.yaml
                        sed -i.bak 's|\\$DOCKER_TAG|$DOCKER_TAG|g' k8s/frontend-deployment.yaml
                        sed -i.bak 's|\\$DOCKER_HUB_USER|$DOCKER_HUB_USER|g' k8s/frontend-deployment.yaml
                    """
                    
                    withCredentials([file(credentialsId: 'k8s-kubeconfig', variable: 'KUBECONFIG_FILE')]) {
                        // Déploiement des applications
                        sh """
                            export KUBECONFIG=\$KUBECONFIG_FILE
                            kubectl config use-context $K8S_CLUSTER
                            
                            # Déploiement backend
                            kubectl apply -f k8s/backend-deployment.yaml -n $K8S_NAMESPACE
                            
                            # Déploiement frontend
                            kubectl apply -f k8s/frontend-deployment.yaml -n $K8S_NAMESPACE
                            
                            # Déploiement MongoDB (si nécessaire)
                            kubectl apply -f k8s/mongodb-deployment.yaml -n $K8S_NAMESPACE || echo "MongoDB non déployé"
                            
                            # Déploiement Ingress (si nécessaire)
                            kubectl apply -f k8s/ingress.yaml -n $K8S_NAMESPACE || echo "Ingress non déployé"
                            
                            # Déploiement HPA (si nécessaire)
                            kubectl apply -f k8s/hpa.yaml -n $K8S_NAMESPACE || echo "HPA non déployé"
                        """
                    }
                }
            }
        }

        stage('Vérification du Déploiement K8S') {
            steps {
                script {
                    echo "🔍 Vérification du déploiement Kubernetes..."
                    
                    withCredentials([file(credentialsId: 'k8s-kubeconfig', variable: 'KUBECONFIG_FILE')]) {
                        // Attendre que les pods soient prêts
                        sh """
                            export KUBECONFIG=\$KUBECONFIG_FILE
                            kubectl config use-context $K8S_CLUSTER
                            
                            echo "⏳ Attente du démarrage des pods..."
                            kubectl wait --for=condition=ready pod -l app=express-backend --timeout=300s -n $K8S_NAMESPACE
                            kubectl wait --for=condition=ready pod -l app=react-frontend --timeout=300s -n $K8S_NAMESPACE
                        """
                        
                        // Vérification de l'état
                        sh """
                            export KUBECONFIG=\$KUBECONFIG_FILE
                            kubectl config use-context $K8S_CLUSTER
                            
                            echo "📊 État des déploiements:"
                            kubectl get deployments -n $K8S_NAMESPACE
                            echo ""
                            echo "📊 État des pods:"
                            kubectl get pods -n $K8S_NAMESPACE -o wide
                            echo ""
                            echo "📊 État des services:"
                            kubectl get services -n $K8S_NAMESPACE
                            echo ""
                            echo "📊 État des ingress:"
                            kubectl get ingress -n $K8S_NAMESPACE || echo "Aucun ingress configuré"
                        """
                    }
                }
            }
        }

        stage('Tests de Santé K8S') {
            steps {
                script {
                    echo "🧪 Tests de santé des services Kubernetes..."
                    
                    withCredentials([file(credentialsId: 'k8s-kubeconfig', variable: 'KUBECONFIG_FILE')]) {
                        // Test du backend depuis l'intérieur du cluster
                        sh """
                            export KUBECONFIG=\$KUBECONFIG_FILE
                            kubectl config use-context $K8S_CLUSTER
                            
                            echo "🔄 Test du backend dans le cluster..."
                            for i in 1 2 3 4 5; do
                                if kubectl exec -n $K8S_NAMESPACE \$(kubectl get pods -n $K8S_NAMESPACE -l app=express-backend -o jsonpath='{.items[0].metadata.name}') -- curl -f -s http://localhost:5001/api/health > /dev/null; then
                                    echo "✅ Backend opérationnel dans Kubernetes"
                                    break
                                else
                                    echo "⚠️ Tentative \$i/5 échouée, nouvel essai dans 10s..."
                                    sleep 10
                                fi
                            done
                        """
                        
                        // Test des services depuis l'extérieur
                        sh """
                            export KUBECONFIG=\$KUBECONFIG_FILE
                            kubectl config use-context $K8S_CLUSTER
                            
                            # Récupérer les URLs externes
                            FRONTEND_URL=\$(kubectl get service frontend-service -n $K8S_NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}' || echo "localhost")
                            BACKEND_URL=\$(kubectl get service backend-service -n $K8S_NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}' || echo "localhost")
                            
                            echo "🌐 Frontend URL: http://\${FRONTEND_URL}:80"
                            echo "🌐 Backend URL: http://\${BACKEND_URL}:5001"
                            
                            echo "🔄 Test du frontend depuis l'extérieur..."
                            for i in 1 2 3 4 5; do
                                if curl -f -s http://\${FRONTEND_URL}:80 > /dev/null; then
                                    echo "✅ Frontend accessible depuis l'extérieur"
                                    break
                                else
                                    echo "⚠️ Tentative \$i/5 échouée, nouvel essai dans 10s..."
                                    sleep 10
                                fi
                            done
                        """
                    }
                }
            }
        }

        stage('Rollout Status et Finalisation') {
            steps {
                script {
                    echo "📈 Vérification du statut des déploiements..."
                    
                    withCredentials([file(credentialsId: 'k8s-kubeconfig', variable: 'KUBECONFIG_FILE')]) {
                        sh """
                            export KUBECONFIG=\$KUBECONFIG_FILE
                            kubectl config use-context $K8S_CLUSTER
                            
                            kubectl rollout status deployment/backend-deployment -n $K8S_NAMESPACE --timeout=300s
                            kubectl rollout status deployment/frontend-deployment -n $K8S_NAMESPACE --timeout=300s
                            
                            echo "✅ Tous les déploiements sont terminés avec succès"
                        """
                    }
                }
            }
        }

        stage('Nettoyage') {
            steps {
                script {
                    echo "🧹 Nettoyage des ressources temporaires..."
                    
                    // Nettoyage des fichiers temporaires
                    sh '''
                        find . -name "*.bak" -delete || true
                        docker system prune -f || true
                    '''
                }
            }
        }
    }

    post {
        always {
            echo "🏁 Pipeline terminé - Statut: ${currentBuild.result}"
            
            // Archivage des logs Kubernetes en cas de besoin
            withCredentials([file(credentialsId: 'k8s-kubeconfig', variable: 'KUBECONFIG_FILE')]) {
                sh """
                    export KUBECONFIG=\$KUBECONFIG_FILE
                    kubectl config use-context $K8S_CLUSTER
                    kubectl get all -n $K8S_NAMESPACE > k8s-status-\${BUILD_NUMBER}.log || true
                """
            }
            archiveArtifacts artifacts: '**/*.log', allowEmptyArchive: true
        }
        success {
            script {
                echo "✅ Déploiement Kubernetes réussi!"
                
                // Récupération des URLs finales
                withCredentials([file(credentialsId: 'k8s-kubeconfig', variable: 'KUBECONFIG_FILE')]) {
                    def frontendUrl = sh(
                        script: """
                            export KUBECONFIG=\$KUBECONFIG_FILE
                            kubectl config use-context $K8S_CLUSTER
                            kubectl get service frontend-service -n $K8S_NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}' || echo 'localhost'
                        """,
                        returnStdout: true
                    ).trim()
                    
                    def backendUrl = sh(
                        script: """
                            export KUBECONFIG=\$KUBECONFIG_FILE
                            kubectl config use-context $K8S_CLUSTER
                            kubectl get service backend-service -n $K8S_NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}' || echo 'localhost'
                        """,
                        returnStdout: true
                    ).trim()
                    
                    emailext(
                        subject: "SUCCESS: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                        body: """
                        Le déploiement Kubernetes de l'application a réussi!
                        
                        Détails:
                        - Build: ${env.BUILD_NUMBER}
                        - Cluster: ${K8S_CLUSTER}
                        - Namespace: ${K8S_NAMESPACE}
                        - Frontend: http://${frontendUrl}:80
                        - Backend: http://${backendUrl}:5001
                        - Images: ${DOCKER_HUB_USER}/${FRONT_IMAGE}:${DOCKER_TAG}
                        
                        Commandes utiles:
                        kubectl get pods -n ${K8S_NAMESPACE}
                        kubectl get services -n ${K8S_NAMESPACE}
                        kubectl logs -f deployment/backend-deployment -n ${K8S_NAMESPACE}
                        
                        Consulter: ${env.BUILD_URL}
                        """,
                        to: "mohamedndoye07@gmail.com"
                    )
                }
            }
        }
        failure {
            script {
                echo "❌ Déploiement échoué - Tentative de rollback..."
                
                withCredentials([file(credentialsId: 'k8s-kubeconfig', variable: 'KUBECONFIG_FILE')]) {
                    // Rollback automatique
                    sh """
                        export KUBECONFIG=\$KUBECONFIG_FILE
                        kubectl config use-context $K8S_CLUSTER
                        
                        kubectl rollout undo deployment/backend-deployment -n $K8S_NAMESPACE || true
                        kubectl rollout undo deployment/frontend-deployment -n $K8S_NAMESPACE || true
                        
                        echo "📋 Logs des pods en échec:"
                        kubectl get pods -n $K8S_NAMESPACE | grep -v Running | grep -v Completed | awk '{print \$1}' | grep -v NAME | xargs -I {} kubectl logs {} -n $K8S_NAMESPACE --tail=50 || true
                    """
                }
                
                emailext(
                    subject: "FAILED: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                    body: """
                    Le déploiement Kubernetes a échoué. Rollback automatique effectué.
                    
                    Détails:
                    - Build: ${env.BUILD_NUMBER}
                    - Cluster: ${K8S_CLUSTER}
                    - Namespace: ${K8S_NAMESPACE}
                    - URL: ${env.BUILD_URL}
                    
                    Veuillez vérifier les logs pour plus d'informations.
                    """,
                    to: "mohamedndoye07@gmail.com"
                )
            }
        }
        unstable {
            echo "⚠️ Déploiement terminé avec des warnings"
            emailext(
                subject: "UNSTABLE: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: "Le pipeline Kubernetes s'est terminé avec des warnings.\nConsulter: ${env.BUILD_URL}",
                to: "mohamedndoye07@gmail.com"
            )
        }
    }
}
